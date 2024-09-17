import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { Transactional } from '@sight/core/persistence/transaction/Transactional';

import { GroupStateChanged } from '@sight/app/domain/group/event/GroupStateChanged';
import { GroupState } from '@sight/app/domain/group/model/constant';
import { SlackMessageCategory } from '@sight/app/domain/message/model/constant';
import {
  ISlackSender,
  SlackSender,
} from '@sight/app/domain/adapter/ISlackSender';
import {
  GroupMemberRepository,
  IGroupMemberRepository,
} from '@sight/app/domain/group/IGroupMemberRepository';
import {
  GroupRepository,
  IGroupRepository,
} from '@sight/app/domain/group/IGroupRepository';

import { Point } from '@sight/constant/point';
import { PointGrantService } from '@sight/app/domain/user/service/PointGrantService';

// TODO[lery]: 그룹 상태 핸들러가 분리되면 그때 제거하기
@EventsHandler(GroupStateChanged)
export class GroupStateChangedHandler
  implements IEventHandler<GroupStateChanged>
{
  constructor(
    private readonly pointGrantService: PointGrantService,
    @Inject(GroupRepository)
    private readonly groupRepository: IGroupRepository,
    @Inject(GroupMemberRepository)
    private readonly groupMemberRepository: IGroupMemberRepository,
    @Inject(SlackSender)
    private readonly slackSender: ISlackSender,
  ) {}

  @Transactional()
  async handle(event: GroupStateChanged): Promise<void> {
    const { groupId, prevState, nextState } = event;

    if (nextState === GroupState.PENDING) {
      return;
    }

    const group = await this.groupRepository.findById(groupId);
    if (!group) {
      return;
    }

    const members = await this.groupMemberRepository.findByGroupId(groupId);
    members.forEach((member) =>
      this.slackSender.send({
        targetUserId: member.userId,
        category: SlackMessageCategory.GROUP_ACTIVITY,
        message: `<a href="/group/${groupId}><u>${
          group.title
        }</u></a> ${this.buildMessage(nextState)}`,
      }),
    );

    const userIds = members.map((m) => m.userId);
    this.pointGrantService.grant({
      targetUserIds: userIds,
      amount: this.buildPoint(prevState, nextState),
      reason: `<u>${group.title}</u> ${this.buildMessage(nextState)}`,
    });
  }

  private buildMessage(nextState: GroupState): string {
    switch (nextState) {
      case 'PROGRESS':
        return '그룹이 다시 진행 중입니다.';
      case 'END_SUCCESS':
        return '그룹이 종료(성공)되었습니다.';
      case 'END_FAIL':
        return '그룹이 종료(실패)되었습니다.';
      case 'SUSPEND':
        return '그룹이 중단 처리되었습니다.';
      default:
        return 'not reachable';
    }
  }

  private buildPoint(prevState: GroupState, nextState: GroupState): number {
    if (nextState === GroupState.PROGRESS) {
      if (prevState == GroupState.END_SUCCESS) {
        return -Point.GROUP_ENDED_WITH_SUCCESS;
      } else if (prevState == GroupState.END_FAIL) {
        return -Point.GROUP_ENDED_WITH_FAIL;
      }
    } else if (nextState === GroupState.END_SUCCESS) {
      return Point.GROUP_ENDED_WITH_SUCCESS;
    } else if (nextState === GroupState.END_FAIL) {
      return Point.GROUP_ENDED_WITH_FAIL;
    } else if (nextState === GroupState.SUSPEND) {
      if (prevState == GroupState.END_SUCCESS) {
        return -Point.GROUP_ENDED_WITH_SUCCESS;
      } else if (prevState == GroupState.END_FAIL) {
        return -Point.GROUP_ENDED_WITH_FAIL;
      }
    }

    return 0;
  }
}
