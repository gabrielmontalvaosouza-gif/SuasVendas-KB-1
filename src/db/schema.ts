import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('SUPPORT').notNull(),
  department: text('department').default('Suporte'),
  isActive: boolean('is_active').default(true).notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const modules = pgTable('modules', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#2563EB'),
  icon: text('icon').default('Layers'),
  orderIndex: integer('order_index').default(0).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const columns = pgTable('columns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#64748B'),
  orderIndex: integer('order_index').default(0).notNull(),
  isResolvedStage: boolean('is_resolved_stage').default(false).notNull(),
  isClosedStage: boolean('is_closed_stage').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bugs = pgTable('bugs', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  stepsToReproduce: text('steps_to_reproduce'),
  expectedBehavior: text('expected_behavior'),
  actualBehavior: text('actual_behavior'),
  moduleId: text('module_id').references(() => modules.id),
  columnId: text('column_id').references(() => columns.id),
  priority: text('priority').default('MEDIUM').notNull(),
  reporterId: text('reporter_id'),
  reporterName: text('reporter_name'),
  assigneeId: text('assignee_id'),
  assigneeName: text('assignee_name'),
  supervisorId: text('supervisor_id'),
  supervisorName: text('supervisor_name'),
  estimatedDueDate: text('estimated_due_date'),
  effectiveResolutionDate: text('effective_resolution_date'),
  solutionApplied: text('solution_applied'),
  technicalNotes: text('technical_notes'),
  isReopened: boolean('is_reopened').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary'),
  moduleId: text('module_id'),
  folderId: text('folder_id'),
  authorName: text('author_name'),
  isPublished: boolean('is_published').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relationships
export const modulesRelations = relations(modules, ({ many }) => ({
  bugs: many(bugs),
}));

export const columnsRelations = relations(columns, ({ many }) => ({
  bugs: many(bugs),
}));

export const bugsRelations = relations(bugs, ({ one }) => ({
  module: one(modules, {
    fields: [bugs.moduleId],
    references: [modules.id],
  }),
  column: one(columns, {
    fields: [bugs.columnId],
    references: [columns.id],
  }),
}));
