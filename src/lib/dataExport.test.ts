import { describe, expect, it } from 'vitest'
import { sessionsToCsv, todosToCsv, sessionsToJson, todosToJson } from './dataExport'
import { buildDayExport, buildDailyMarkdown } from './markdownExport'
import type { Session, TodoItem } from '../types'

describe('dataExport', () => {
  describe('CSV formula injection prevention', () => {
    it('escapes cells starting with =, +, -, @, \\t, \\r', () => {
      const maliciousSessions: Session[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          start: 1700000000000,
          end: 1700001500000,
          durationMs: 1500000,
          task: '=SUM(1+1)*cmd|',
          tag: '+admin',
          notes: '@malicious_site',
          updatedAt: 1700001500000,
        },
      ]

      const csv = sessionsToCsv(maliciousSessions)
      expect(csv).toContain("'=SUM(1+1)*cmd|")
      expect(csv).toContain("'+admin")
      expect(csv).toContain("'@malicious_site")
    })

    it('does not prefix normal numbers in numeric columns', () => {
      const todos: TodoItem[] = [
        {
          id: 'todo-1',
          title: 'Normal task',
          tag: 'Work',
          done: true,
          pomodoros: 3,
          createdAt: 1700000000000,
          completedAt: 1700001500000,
          updatedAt: 1700001500000,
        },
      ]

      const csv = todosToCsv(todos)
      const lines = csv.split('\n')
      expect(lines[0]).toBe('id;title;tag;done;pomodoros;created_at;completed_at')
      expect(lines[1]).toBe('todo-1;Normal task;Work;1;3;1700000000000;1700001500000')
    })
  })

  describe('JSON export', () => {
    it('serializes sessions to valid JSON', () => {
      const sessions: Session[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          start: 1700000000000,
          end: 1700001500000,
          durationMs: 1500000,
          task: 'Coding',
          tag: 'Dev',
          notes: 'Good session',
          updatedAt: 1700001500000,
        },
      ]

      const jsonStr = sessionsToJson(sessions)
      const parsed = JSON.parse(jsonStr)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].task).toBe('Coding')
      expect(parsed[0].durationMs).toBe(1500000)
    })

    it('serializes todos to valid JSON', () => {
      const todos: TodoItem[] = [
        {
          id: 'todo-1',
          title: 'Task 1',
          tag: 'Dev',
          done: false,
          pomodoros: 2,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        },
      ]

      const jsonStr = todosToJson(todos)
      const parsed = JSON.parse(jsonStr)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].title).toBe('Task 1')
      expect(parsed[0].done).toBe(false)
    })
  })

  describe('Markdown export sanitization', () => {
    it('escapes pipe delimiters and HTML tags in table cells', () => {
      const exportData = buildDayExport(
        [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            start: 1700000000000,
            end: 1700001500000,
            durationMs: 1500000,
            task: '<script>alert(1)</script> | malicious table cell |',
            tag: '<b>bold-tag</b> | evil',
            notes: '<img src=x onerror=alert(1)>\nmultiline note',
          },
        ],
        new Date(1700000000000),
      )

      const md = buildDailyMarkdown(exportData)
      // Table cells must escape pipes
      expect(md).toContain('&lt;script&gt;alert(1)&lt;/script&gt; \\| malicious table cell \\|')
      expect(md).toContain('&lt;b&gt;bold-tag&lt;/b&gt; \\| evil')
      // Reflections must sanitize HTML and newlines
      expect(md).toContain('&lt;img src=x onerror=alert(1)&gt; · multiline note')
    })
  })
})
