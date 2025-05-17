import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    password: v.string(),
    isOnline: v.optional(v.boolean()),
    blockedUsers: v.optional(v.array(v.id("users"))),
  }).index("by_name", ["name"]),
  messages: defineTable({
    content: v.string(),
    senderId: v.id("users"),
    receiverId: v.id("users"),
  }),
  friendships: defineTable({
    userId1: v.id("users"),
    userId2: v.id("users"),
    status: v.string(),
    actionUserId: v.id("users"),
  })
    .index("by_user1", ["userId1"])
    .index("by_user2", ["userId2"])
    .index("by_users", ["userId1", "userId2"]),
});
