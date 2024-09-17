import { faker } from '@faker-js/faker';

import {
  GroupLog,
  GroupLogConstructorParams,
} from '@sight/app/domain/group/model/GroupLog';
import {
  GroupMember,
  GroupMemberConstructorParams,
} from '@sight/app/domain/group/model/GroupMember';

export function generateGroupMember(
  params?: Partial<GroupMemberConstructorParams>,
): GroupMember {
  return new GroupMember({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    groupId: faker.string.uuid(),
    createdAt: faker.date.anytime(),
    ...params,
  });
}

export function generateGroupLog(
  params?: Partial<GroupLogConstructorParams>,
): GroupLog {
  return new GroupLog({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    groupId: faker.string.uuid(),
    message: faker.lorem.sentence(),
    createdAt: faker.date.anytime(),
    ...params,
  });
}
