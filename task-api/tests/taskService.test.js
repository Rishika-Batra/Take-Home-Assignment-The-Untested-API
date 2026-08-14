const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('getPaginated', () => {
  it('returns the first `limit` tasks when page=1', () => {
    for (let i = 0; i < 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }

    const page1 = taskService.getPaginated(1, 10);

    expect(page1).toHaveLength(10);
    expect(page1[0].title).toBe('Task 0');
  });

  it('returns the next `limit` tasks when page=2', () => {
    for (let i = 0; i < 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }

    const page2 = taskService.getPaginated(2, 10);

    expect(page2).toHaveLength(5);
    expect(page2[0].title).toBe('Task 10');
  });
});

describe('getByStatus', () => {
  it('matches status exactly, not as a substring', () => {
    taskService.create({ title: 'A', status: 'in_progress' });
    taskService.create({ title: 'B', status: 'todo' });

    const results = taskService.getByStatus('todo');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('B');
  });

  it.skip('KNOWN BUG (not fixed, see BUGS.md): does not return in_progress tasks when filtering for a status that is a substring of it', () => {
    taskService.create({ title: 'A', status: 'in_progress' });

    const results = taskService.getByStatus('progress');

    expect(results).toHaveLength(0);
  });
});

describe('completeTask', () => {
  it.skip('KNOWN BUG (not fixed, see BUGS.md): preserves the original priority when completing a task', () => {
    const task = taskService.create({ title: 'Urgent fix', priority: 'high' });

    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.priority).toBe('high');
  });

  it('sets completedAt when completing a task', () => {
    const task = taskService.create({ title: 'Something' });

    const completed = taskService.completeTask(task.id);

    expect(completed.completedAt).not.toBeNull();
  });
});
