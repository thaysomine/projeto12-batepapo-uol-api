import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

const app = express();
app.use(express.json()); 
app.use(cors());

// conectando ao banco de dados
let database = null;
dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URL); // criando a config da conexão
const promise = mongoClient.connect();
promise.then(() => {
    database = mongoClient.db("participantsDataBase");
    console.log("Conectado ao banco de dados");
});
promise.catch(err => console.log(err));

// post e get para cadastrar e listar participantes
app.post('/participants', async (req, res) => {
    const body = req.body;
    const participant = {
        name: body.name, 
        lastStatus: Date.now()
    };
    console.log('body do cadastro', body);

    const schema = joi.object({
        name: joi.string().required()
    });
    const validation = schema.validate(body);
    if (validation.error) {
        console.log('Erro de validação', validation.error);
        res.status(422).send(validation.error.details[0].message);
        return;
    }

    try {
        const checkName = await database.collection('participants').findOne({name: body.name});
        if (checkName) {
            res.status(409).send('Participante já cadastrado');
            console.log('Participante já cadastrado');
            return;
        }

        const loginMessage = {
            from: body.name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format('HH:mm:ss')
        }
        await database.collection('participants').insertOne(participant);
        await database.collection('messages').insertOne(loginMessage);
        console.log(loginMessage);
        res.status(201);
    }
    catch {
        res.status(422).send("Erro ao cadastrar");
    }
});

app.get('/participants', async (req, res) => {
    try {
        const response = await database.collection("participants").find({}).toArray();
        console.log(response);
        res.send(response);
    } catch(err) {
        console.log("deu erro");
        res.status(500).send("Erro ao buscar");
    }
});

app.listen(5000);