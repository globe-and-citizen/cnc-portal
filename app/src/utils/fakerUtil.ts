import { faker } from '@faker-js/faker'

// Small utility wrappers around faker for generating user display data
export function generateUserName() {
  return faker.person.fullName()
}

export function generateUserAvatar() {
  return faker.image.avatar()
}

export function generateFakeUser() {
  return {
    name: generateUserName(),
    imageUrl: generateUserAvatar()
  }
}
