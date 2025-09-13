const request = require('supertest');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Create a test version of the app
function createApp() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));
  
  // In-memory storage for todos
  let todos = [];
  let nextId = 1;
  
  // Reset function for tests
  app.resetTodos = () => {
    todos = [];
    nextId = 1;
  };
  
  // Routes
  app.get('/api/todos', (req, res) => {
    res.json(todos);
  });
  
  app.post('/api/todos', (req, res) => {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Todo text is required' });
    }
    
    const newTodo = {
      id: nextId++,
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    todos.push(newTodo);
    res.status(201).json(newTodo);
  });
  
  app.patch('/api/todos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { completed } = req.body;
    
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    todo.completed = completed;
    res.json(todo);
  });
  
  app.delete('/api/todos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = todos.findIndex(t => t.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    todos.splice(index, 1);
    res.status(204).send();
  });
  
  return app;
}

describe('Todo API Tests', () => {
  let app;
  
  beforeEach(() => {
    app = createApp();
    app.resetTodos();
  });
  
  describe('GET /api/todos', () => {
    test('should return empty array when no todos exist', async () => {
      const response = await request(app)
        .get('/api/todos')
        .expect(200);
      
      expect(response.body).toEqual([]);
    });
    
    test('should return all todos', async () => {
      // Add some todos first
      await request(app)
        .post('/api/todos')
        .send({ text: 'First todo' });
      
      await request(app)
        .post('/api/todos')
        .send({ text: 'Second todo' });
      
      const response = await request(app)
        .get('/api/todos')
        .expect(200);
      
      expect(response.body).toHaveLength(2);
      expect(response.body[0].text).toBe('First todo');
      expect(response.body[1].text).toBe('Second todo');
    });
  });
  
  describe('POST /api/todos', () => {
    test('should create a new todo', async () => {
      const todoText = 'Test todo';
      
      const response = await request(app)
        .post('/api/todos')
        .send({ text: todoText })
        .expect(201);
      
      expect(response.body).toMatchObject({
        id: 1,
        text: todoText,
        completed: false
      });
      expect(response.body.createdAt).toBeDefined();
    });
    
    test('should trim whitespace from todo text', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '  Trimmed todo  ' })
        .expect(201);
      
      expect(response.body.text).toBe('Trimmed todo');
    });
    
    test('should return 400 for empty text', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '' })
        .expect(400);
      
      expect(response.body.error).toBe('Todo text is required');
    });
    
    test('should return 400 for missing text', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Todo text is required');
    });
    
    test('should return 400 for whitespace-only text', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '   ' })
        .expect(400);
      
      expect(response.body.error).toBe('Todo text is required');
    });
    
    test('should auto-increment todo IDs', async () => {
      const response1 = await request(app)
        .post('/api/todos')
        .send({ text: 'First' })
        .expect(201);
      
      const response2 = await request(app)
        .post('/api/todos')
        .send({ text: 'Second' })
        .expect(201);
      
      expect(response1.body.id).toBe(1);
      expect(response2.body.id).toBe(2);
    });
  });
  
  describe('PATCH /api/todos/:id', () => {
    test('should update todo completion status to true', async () => {
      // Create a todo first
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Test todo' });
      
      const todoId = createResponse.body.id;
      
      const updateResponse = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ completed: true })
        .expect(200);
      
      expect(updateResponse.body.completed).toBe(true);
      expect(updateResponse.body.id).toBe(todoId);
    });
    
    test('should update todo completion status to false', async () => {
      // Create a completed todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Test todo' });
      
      const todoId = createResponse.body.id;
      
      // Mark as completed
      await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ completed: true });
      
      // Mark as not completed
      const updateResponse = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ completed: false })
        .expect(200);
      
      expect(updateResponse.body.completed).toBe(false);
    });
    
    test('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .patch('/api/todos/999')
        .send({ completed: true })
        .expect(404);
      
      expect(response.body.error).toBe('Todo not found');
    });
    
    test('should handle invalid ID format', async () => {
      const response = await request(app)
        .patch('/api/todos/invalid')
        .send({ completed: true })
        .expect(404);
      
      expect(response.body.error).toBe('Todo not found');
    });
  });
  
  describe('DELETE /api/todos/:id', () => {
    test('should delete an existing todo', async () => {
      // Create a todo first
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'To be deleted' });
      
      const todoId = createResponse.body.id;
      
      // Delete the todo
      await request(app)
        .delete(`/api/todos/${todoId}`)
        .expect(204);
      
      // Verify it's deleted
      const getResponse = await request(app)
        .get('/api/todos')
        .expect(200);
      
      expect(getResponse.body).toHaveLength(0);
    });
    
    test('should return 404 for non-existent todo', async () => {
      const response = await request(app)
        .delete('/api/todos/999')
        .expect(404);
      
      expect(response.body.error).toBe('Todo not found');
    });
    
    test('should only delete the specified todo', async () => {
      // Create multiple todos
      await request(app)
        .post('/api/todos')
        .send({ text: 'Todo 1' });
      
      const todo2Response = await request(app)
        .post('/api/todos')
        .send({ text: 'Todo 2' });
      
      await request(app)
        .post('/api/todos')
        .send({ text: 'Todo 3' });
      
      // Delete todo 2
      await request(app)
        .delete(`/api/todos/${todo2Response.body.id}`)
        .expect(204);
      
      // Verify only todo 2 was deleted
      const getResponse = await request(app)
        .get('/api/todos')
        .expect(200);
      
      expect(getResponse.body).toHaveLength(2);
      expect(getResponse.body[0].text).toBe('Todo 1');
      expect(getResponse.body[1].text).toBe('Todo 3');
    });
  });
  
  describe('Integration Tests', () => {
    test('should handle complete todo lifecycle', async () => {
      // Create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Complete lifecycle test' })
        .expect(201);
      
      const todoId = createResponse.body.id;
      expect(createResponse.body.completed).toBe(false);
      
      // Update completion status
      const updateResponse = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ completed: true })
        .expect(200);
      
      expect(updateResponse.body.completed).toBe(true);
      
      // Get all todos to verify
      const getResponse = await request(app)
        .get('/api/todos')
        .expect(200);
      
      expect(getResponse.body).toHaveLength(1);
      expect(getResponse.body[0].completed).toBe(true);
      
      // Delete the todo
      await request(app)
        .delete(`/api/todos/${todoId}`)
        .expect(204);
      
      // Verify deletion
      const finalGetResponse = await request(app)
        .get('/api/todos')
        .expect(200);
      
      expect(finalGetResponse.body).toHaveLength(0);
    });
    
    test('should handle multiple todos correctly', async () => {
      // Create multiple todos
      const todos = [
        { text: 'Buy groceries' },
        { text: 'Walk the dog' },
        { text: 'Read a book' },
        { text: 'Exercise' }
      ];
      
      const createdTodos = [];
      for (const todo of todos) {
        const response = await request(app)
          .post('/api/todos')
          .send(todo)
          .expect(201);
        createdTodos.push(response.body);
      }
      
      // Mark some as completed
      await request(app)
        .patch(`/api/todos/${createdTodos[0].id}`)
        .send({ completed: true });
      
      await request(app)
        .patch(`/api/todos/${createdTodos[2].id}`)
        .send({ completed: true });
      
      // Get all todos
      const getResponse = await request(app)
        .get('/api/todos')
        .expect(200);
      
      // Verify the state
      expect(getResponse.body).toHaveLength(4);
      const completedTodos = getResponse.body.filter(t => t.completed);
      expect(completedTodos).toHaveLength(2);
    });
  });
});