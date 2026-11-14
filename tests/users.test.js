import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { createDriver, createUser, expectError, expectSuccess, INVALID_ID, newId } from './helpers.js';

const validUser = () => ({ firstName: 'Ana', lastName: 'Paz', email: 'ana.paz@shipnow.test', password: 'coder123' });

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('debería listar los usuarios sin la contraseña', async () => {
      await createUser();
      await createDriver();

      const users = expectSuccess(await request(app).get('/api/users'));

      expect(users).to.be.an('array').with.lengthOf(2);
      for (const user of users) {
        expect(user).to.include.all.keys('_id', 'firstName', 'lastName', 'email', 'role');
        expect(user).to.not.have.property('password');
      }
    });

    it('debería devolver una lista vacía si no hay usuarios', async () => {
      expect(expectSuccess(await request(app).get('/api/users'))).to.deep.equal([]);
    });
  });

  describe('POST /api/users', () => {
    it('debería crear un usuario con rol customer por defecto y la contraseña hasheada', async () => {
      const user = expectSuccess(await request(app).post('/api/users').send(validUser()), 201);

      expect(user).to.include({ firstName: 'Ana', lastName: 'Paz', email: 'ana.paz@shipnow.test', role: 'customer' });
      expect(user).to.not.have.property('password');
      const saved = await UserModel.findById(user._id).lean();
      expect(saved.password).to.match(/^\$2[aby]\$/).and.not.equal('coder123');
    });

    it('debería responder 400 PASSWORD_REQUIRED si falta la contraseña', async () => {
      const { password, ...withoutPassword } = validUser();
      expectError(await request(app).post('/api/users').send(withoutPassword), 400, 'PASSWORD_REQUIRED');
    });

    it('debería responder 400 VALIDATION_ERROR si falta un campo obligatorio', async () => {
      const { lastName, ...withoutLastName } = validUser();
      const res = await request(app).post('/api/users').send(withoutLastName);
      expectError(res, 400, 'VALIDATION_ERROR', 'El campo "lastName" es obligatorio');
    });

    it('debería responder 400 VALIDATION_ERROR si el rol no existe', async () => {
      const res = await request(app).post('/api/users').send({ ...validUser(), role: 'superuser' });
      expectError(res, 400, 'VALIDATION_ERROR', '"superuser" no es un valor válido para "role"');
    });

    it('debería responder 409 USER_ALREADY_EXISTS si el email ya está registrado', async () => {
      await createUser({ email: 'ana.paz@shipnow.test' });
      expectError(await request(app).post('/api/users').send(validUser()), 409, 'USER_ALREADY_EXISTS');
    });

    it('debería responder 400 INVALID_JSON si el body no es un JSON válido', async () => {
      const res = await request(app).post('/api/users').set('Content-Type', 'application/json').send('{"firstName":');
      expectError(res, 400, 'INVALID_JSON');
    });
  });

  describe('GET /api/users/:id', () => {
    it('debería devolver el usuario pedido', async () => {
      const created = await createUser();
      const user = expectSuccess(await request(app).get(`/api/users/${created._id}`));
      expect(user).to.include({ _id: String(created._id), email: created.email });
      expect(user).to.not.have.property('password');
    });

    it('debería responder 404 USER_NOT_FOUND si el usuario no existe', async () => {
      expectError(await request(app).get(`/api/users/${newId()}`), 404, 'USER_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).get(`/api/users/${INVALID_ID}`), 400, 'INVALID_ID');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('debería actualizar solo los campos enviados', async () => {
      const driver = await createDriver();
      const user = expectSuccess(await request(app).put(`/api/users/${driver._id}`).send({ isAvailable: false }));
      expect(user).to.include({ isAvailable: false, email: driver.email, role: 'driver' });
    });

    it('debería volver a hashear la contraseña si se cambia', async () => {
      const created = await createUser();
      expectSuccess(await request(app).put(`/api/users/${created._id}`).send({ password: 'nueva123' }));
      const saved = await UserModel.findById(created._id).lean();
      expect(saved.password).to.match(/^\$2[aby]\$/);
    });

    it('debería responder 400 VALIDATION_ERROR si el rol no existe', async () => {
      const created = await createUser();
      const res = await request(app).put(`/api/users/${created._id}`).send({ role: 'superuser' });
      expectError(res, 400, 'VALIDATION_ERROR', '"superuser" no es un valor válido para "role"');
    });

    it('debería responder 400 PASSWORD_REQUIRED si la contraseña viene vacía', async () => {
      const created = await createUser();
      expectError(await request(app).put(`/api/users/${created._id}`).send({ password: '' }), 400, 'PASSWORD_REQUIRED');
    });

    it('debería responder 409 USER_ALREADY_EXISTS si el email lo usa otro usuario', async () => {
      const other = await createUser();
      const created = await createUser();
      const res = await request(app).put(`/api/users/${created._id}`).send({ email: other.email });
      expectError(res, 409, 'USER_ALREADY_EXISTS');
    });

    it('debería responder 404 USER_NOT_FOUND si el usuario no existe', async () => {
      expectError(await request(app).put(`/api/users/${newId()}`).send({ lastName: 'Pérez' }), 404, 'USER_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).put(`/api/users/${INVALID_ID}`).send({ lastName: 'Pérez' }), 400, 'INVALID_ID');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('debería eliminar el usuario y devolverlo', async () => {
      const created = await createUser();
      const user = expectSuccess(await request(app).delete(`/api/users/${created._id}`));
      expect(user).to.include({ _id: String(created._id) });
      expect(await UserModel.exists({ _id: created._id })).to.equal(null);
    });

    it('debería responder 404 USER_NOT_FOUND si el usuario no existe', async () => {
      expectError(await request(app).delete(`/api/users/${newId()}`), 404, 'USER_NOT_FOUND');
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await request(app).delete(`/api/users/${INVALID_ID}`), 400, 'INVALID_ID');
    });
  });
});
