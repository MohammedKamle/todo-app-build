const request = require('supertest');
const app = require('../server');

describe('Todo API', () => {
  
  // Clear the todos array before each test to avoid test interference
  beforeEach(() => {
    // Reset the in-memory todos and nextId to ensure tests are isolated
    global.todos = [];
    global.nextId = 1;
  });

  // Test GET /api/todos (Get all todos)
  it('should return an empty array initially', async () => {
    const response = await request(app).get('/api/todos');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  // Test POST /api/todos (Add a new todo to the list)
  it('should create a new todo', async () => {
    const newTodo = { text: 'Buy milk' };
    const response = await request(app).post('/api/todos').send(newTodo);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.text).toBe(newTodo.text);
    expect(response.body.completed).toBe(false);
  });

  // Test POST /api/todos with invalid data
  it('should return an error if text is not provided', async () => {
    const response = await request(app).post('/api/todos').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Todo text is required');
  });

  // Test PATCH /api/todos/:id (Update todo completion status)
  it('should update a todo completion status', async () => {
    const newTodo = { text: 'Learn Node.js' };
    const createdTodo = await request(app).post('/api/todos').send(newTodo);

    const updatedTodo = { completed: true };
    const response = await request(app).patch(`/api/todos/${createdTodo.body.id}`).send(updatedTodo);

    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
  });

  // Test PATCH /api/todos/:id for a non-existent todo
  it('should return a 404 if the todo is not found', async () => {
    const response = await request(app).patch('/api/todos/999').send({ completed: true });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Todo not found');
  });

  // Test DELETE /api/todos/:id (Delete a todo)
  it('should delete a todo successfully', async () => {
    const newTodo = { text: 'Go for a run' };
    const createdTodo = await request(app).post('/api/todos').send(newTodo);

    const response = await request(app).delete(`/api/todos/${createdTodo.body.id}`);
    expect(response.status).toBe(204);

    // Check if the todo is really deleted
    const todosAfterDelete = await request(app).get('/api/todos');
    expect(todosAfterDelete.body).toHaveLength(2);
  });

  // Test DELETE /api/todos/:id for a non-existent todo
  it('should return a 404 if the todo to delete does not exist', async () => {
    const response = await request(app).delete('/api/todos/999');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Todo not found');
  });



});

