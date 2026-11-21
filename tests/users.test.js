import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { config } from '../src/config/index.js';
import { UserModel } from '../src/models/user.model.js';
import {
  createDriver,
  createUser,
  expectError,
  expectPage,
  expectSuccess,
  fileExists,
  filesIn,
  INVALID_ID,
  newId,
  PDF_FILE,
  PNG_FILE,
} from './helpers.js';

const validUser = () => ({ firstName: 'Ana', lastName: 'Paz', email: 'ana.paz@shipnow.test', password: 'coder123' });

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('debería listar los usuarios sin la contraseña', async () => {
      await createUser();
      await createDriver();

      const users = expectPage(await request(app).get('/api/users'), { page: 1, limit: 10, total: 2, totalPages: 1 });

      expect(users).to.have.lengthOf(2);
      for (const user of users) {
        expect(user).to.include.all.keys('_id', 'firstName', 'lastName', 'email', 'role');
        expect(user).to.not.have.property('password');
      }
    });

    it('debería devolver una lista vacía si no hay usuarios', async () => {
      const res = await request(app).get('/api/users');
      expect(expectPage(res, { page: 1, limit: 10, total: 0, totalPages: 0 })).to.deep.equal([]);
    });

    it('debería devolver como máximo 10 usuarios si no se indica limit', async () => {
      for (let i = 0; i < 12; i++) await createUser();
      const users = expectPage(await request(app).get('/api/users'), { page: 1, limit: 10, total: 12, totalPages: 2 });
      expect(users).to.have.lengthOf(10);
    });

    it('debería paginar con page y limit, del más nuevo al más viejo', async () => {
      const created = [];
      for (let i = 0; i < 5; i++) created.push(await createUser());
      const ids = created.map((user) => String(user._id)).reverse();

      const first = expectPage(await request(app).get('/api/users?page=1&limit=2'), { page: 1, limit: 2, total: 5, totalPages: 3 });
      const last = expectPage(await request(app).get('/api/users?page=3&limit=2'), { page: 3, limit: 2, total: 5, totalPages: 3 });

      expect(first.map((user) => user._id)).to.deep.equal(ids.slice(0, 2));
      expect(last.map((user) => user._id)).to.deep.equal(ids.slice(4));
    });

    it('debería devolver una página vacía si page supera el total de páginas', async () => {
      await createUser();
      const res = await request(app).get('/api/users?page=5');
      expect(expectPage(res, { page: 5, limit: 10, total: 1, totalPages: 1 })).to.deep.equal([]);
    });

    it('debería filtrar por role y contar solo los que cumplen el filtro', async () => {
      await createUser();
      const driver = await createDriver();

      const users = expectPage(await request(app).get('/api/users?role=driver'), { page: 1, limit: 10, total: 1, totalPages: 1 });
      expect(users.map((user) => user._id)).to.deep.equal([String(driver._id)]);
    });

    for (const [query, param] of [
      ['limit=0', 'limit'],
      ['limit=101', 'limit'],
      ['limit=2.5', 'limit'],
      ['page=abc', 'page'],
      ['page=-1', 'page'],
      ['role=pirata', 'role'],
    ]) {
      it(`debería responder 400 INVALID_QUERY_PARAM con ?${query}`, async () => {
        const res = await request(app).get(`/api/users?${query}`);
        expectError(res, 400, 'INVALID_QUERY_PARAM', `El parámetro "${param}" no es válido`);
        expect(res.body.details).to.be.a('string').that.is.not.empty;
      });
    }
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

  describe('POST /api/users/:id/documents', () => {
    const upload = (id) => request(app).post(`/api/users/${id}/documents`);

    const expectNoFilesLeft = async () => {
      expect(await filesIn('tmp')).to.deep.equal([]);
      expect(await filesIn('documents')).to.deep.equal([]);
    };

    it('debería responder 400 FILE_REQUIRED si el archivo llega vacío y no dejarlo en el servidor', async () => {
      const created = await createUser();
      const res = await upload(created._id)
        .field('type', 'user_document')
        .attach('document', Buffer.alloc(0), { filename: 'vacio.pdf', contentType: 'application/pdf' });

      expectError(res, 400, 'FILE_REQUIRED', 'El archivo llegó vacío');
      await expectNoFilesLeft();
      expect((await UserModel.findById(created._id)).documents).to.have.lengthOf(0);
    });

    it('debería guardar el archivo en uploads/documents y registrar sus metadatos en el usuario', async () => {
      const created = await createUser();
      const res = await upload(created._id).field('type', 'user_document').attach('document', PDF_FILE, 'dni.pdf');
      const user = expectSuccess(res);

      expect(user).to.not.have.property('password');
      expect(user.documents).to.have.lengthOf(1);
      const [document] = user.documents;
      expect(document).to.have.all.keys('originalName', 'fileName', 'path', 'mimeType', 'size', 'type', 'uploadedAt');
      expect(document).to.include({ originalName: 'dni.pdf', mimeType: 'application/pdf', size: PDF_FILE.length, type: 'user_document' });
      expect(document.fileName).to.match(/^\d+-[\w-]+\.pdf$/);
      expect(document.path).to.equal(`${config.uploadsDir}/documents/${document.fileName}`);
      expect(await fileExists(document.path)).to.equal(true);
      expect(await filesIn('tmp')).to.deep.equal([]);
      expect((await UserModel.findById(created._id)).documents).to.have.lengthOf(1);
    });

    it('debería usar user_document si no se envía el tipo', async () => {
      const created = await createUser();
      const user = expectSuccess(await upload(created._id).attach('document', PDF_FILE, 'constancia.pdf'));
      expect(user.documents[0].type).to.equal('user_document');
    });

    it('debería guardar la licencia de un repartidor en uploads/licenses', async () => {
      const driver = await createDriver();
      const res = await upload(driver._id).field('type', 'driver_license').attach('document', PNG_FILE, 'licencia.png');
      const [document] = expectSuccess(res).documents;

      expect(document).to.include({ type: 'driver_license', mimeType: 'image/png' });
      expect(document.fileName).to.match(/\.png$/);
      expect(document.path).to.equal(`${config.uploadsDir}/licenses/${document.fileName}`);
      expect(await fileExists(document.path)).to.equal(true);
    });

    it('debería sumar el documento a los que ya tenía el usuario', async () => {
      const created = await createUser();
      await upload(created._id).attach('document', PDF_FILE, 'dni.pdf');
      const user = expectSuccess(await upload(created._id).attach('document', PDF_FILE, 'constancia.pdf'));
      expect(user.documents.map((document) => document.originalName)).to.deep.equal(['dni.pdf', 'constancia.pdf']);
    });

    it('debería borrar los archivos del usuario cuando se elimina el usuario', async () => {
      const created = await createUser();
      const [document] = expectSuccess(await upload(created._id).attach('document', PDF_FILE, 'dni.pdf')).documents;

      expectSuccess(await request(app).delete(`/api/users/${created._id}`));
      expect(await fileExists(document.path)).to.equal(false);
    });

    it('debería responder 400 FILE_REQUIRED si no se envía el archivo', async () => {
      const created = await createUser();
      expectError(await upload(created._id).field('type', 'user_document'), 400, 'FILE_REQUIRED');
    });

    it('debería responder 400 FILE_REQUIRED si el body es JSON en lugar de multipart/form-data', async () => {
      const created = await createUser();
      expectError(await upload(created._id).send({ type: 'user_document' }), 400, 'FILE_REQUIRED');
    });

    it('debería responder 400 UNEXPECTED_FILE_FIELD si el archivo llega en otro campo', async () => {
      const created = await createUser();
      const res = await upload(created._id).attach('archivo', PDF_FILE, 'dni.pdf');
      expect(expectError(res, 400, 'UNEXPECTED_FILE_FIELD').details).to.equal('Se espera un solo archivo en el campo "document"');
      await expectNoFilesLeft();
    });

    it('debería responder 400 UNEXPECTED_FILE_FIELD si se envía más de un archivo', async () => {
      const created = await createUser();
      const res = await upload(created._id).attach('document', PDF_FILE, 'dni.pdf').attach('document', PDF_FILE, 'otro.pdf');
      expectError(res, 400, 'UNEXPECTED_FILE_FIELD');
      await expectNoFilesLeft();
    });

    it('debería responder 400 INVALID_DOCUMENT_TYPE si el tipo de documento no existe y no dejar el archivo', async () => {
      const created = await createUser();
      const res = await upload(created._id).field('type', 'pasaporte').attach('document', PDF_FILE, 'dni.pdf');
      expect(expectError(res, 400, 'INVALID_DOCUMENT_TYPE').details).to.equal('Tipos válidos: user_document, driver_license');
      await expectNoFilesLeft();
    });

    it('debería responder 400 INVALID_DOCUMENT_TYPE si se manda delivery_proof, que es solo para pedidos', async () => {
      const created = await createUser();
      const res = await upload(created._id).field('type', 'delivery_proof').attach('document', PDF_FILE, 'dni.pdf');
      expectError(res, 400, 'INVALID_DOCUMENT_TYPE');
    });

    it('debería responder 400 INVALID_DOCUMENT_TYPE si un usuario que no es repartidor sube una licencia', async () => {
      const created = await createUser();
      const res = await upload(created._id).field('type', 'driver_license').attach('document', PDF_FILE, 'licencia.pdf');
      expectError(res, 400, 'INVALID_DOCUMENT_TYPE', 'Solo los repartidores pueden cargar una licencia de conducir');
      expect(await filesIn('licenses')).to.deep.equal([]);
    });

    it('debería responder 415 INVALID_FILE_TYPE si el tipo de archivo no está permitido', async () => {
      const created = await createUser();
      const res = await upload(created._id).attach('document', Buffer.from('hola'), 'notas.txt');
      expectError(res, 415, 'INVALID_FILE_TYPE');
      await expectNoFilesLeft();
    });

    it('debería responder 415 INVALID_FILE_TYPE si el contenido no coincide con el tipo declarado', async () => {
      const created = await createUser();
      const res = await upload(created._id).attach('document', Buffer.from('MZ ejecutable disfrazado'), 'dni.pdf');
      expectError(res, 415, 'INVALID_FILE_TYPE', 'El contenido del archivo no coincide con su tipo');
      await expectNoFilesLeft();
    });

    it('debería responder 413 FILE_TOO_LARGE si el archivo supera los 5 MB', async () => {
      const created = await createUser();
      const bigFile = Buffer.concat([PDF_FILE, Buffer.alloc(5 * 1024 * 1024)]);
      const res = await upload(created._id).attach('document', bigFile, 'enorme.pdf');
      expect(expectError(res, 413, 'FILE_TOO_LARGE').details).to.equal('Máximo: 5 MB');
      await expectNoFilesLeft();
    });

    it('debería responder 404 USER_NOT_FOUND si el usuario no existe y no dejar el archivo', async () => {
      expectError(await upload(newId()).attach('document', PDF_FILE, 'dni.pdf'), 404, 'USER_NOT_FOUND');
      await expectNoFilesLeft();
    });

    it('debería responder 400 INVALID_ID si el ID no tiene formato válido', async () => {
      expectError(await upload(INVALID_ID).attach('document', PDF_FILE, 'dni.pdf'), 400, 'INVALID_ID');
      await expectNoFilesLeft();
    });
  });
});
