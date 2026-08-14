const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('POST /tasks', () => {
  it('creates a task with valid data', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write tests', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('todo');
    expect(res.body.assignee).toBeNull();
    expect(res.body.id).toBeDefined();
  });

  it('rejects a missing title', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('rejects an invalid priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task', priority: 'urgent' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/i);
  });
});

describe('GET /tasks', () => {
  it('lists all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns an empty array when there are no tasks', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters by status', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=done');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('B');
  });

  it('paginates results', async () => {
    for (let i = 0; i < 12; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }

    const res = await request(app).get('/tasks?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].title).toBe('Task 0');
  });
});

describe('PUT /tasks/:id', () => {
  it('updates an existing task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Original' });

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('returns 404 for a nonexistent task', async () => {
    const res = await request(app)
      .put('/tasks/does-not-exist')
      .send({ title: 'Whatever' });

    expect(res.status).toBe(404);
  });

  it('rejects an invalid status on update', async () => {
    const created = await request(app).post('/tasks').send({ title: 'A' });

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes an existing task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'To delete' });

    const res = await request(app).delete(`/tasks/${created.body.id}`);

    expect(res.status).toBe(204);

    const getRes = await request(app).get('/tasks');
    expect(getRes.body).toHaveLength(0);
  });

  it('returns 404 for a nonexistent task', async () => {
    const res = await request(app).delete('/tasks/does-not-exist');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as complete', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Finish me' });

    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 for a nonexistent task', async () => {
    const res = await request(app).patch('/tasks/does-not-exist/complete');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a user', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Sachit' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Sachit');
  });

  it('returns 404 for a nonexistent task', async () => {
    const res = await request(app)
      .patch('/tasks/does-not-exist/assign')
      .send({ assignee: 'Sachit' });

    expect(res.status).toBe(404);
  });

  it('rejects an empty assignee string', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Task' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing assignee field', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Task' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('allows reassigning an already-assigned task (overwrites previous assignee)', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Task' });
    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });
});

describe('GET /tasks/stats', () => {
  it('returns counts by status and overdue count', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });
    await request(app)
      .post('/tasks')
      .send({ title: 'C', status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(2);
    expect(res.body.done).toBe(1);
    expect(res.body.overdue).toBe(1);
  });

  it('returns all zeros when there are no tasks', async () => {
    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
});
