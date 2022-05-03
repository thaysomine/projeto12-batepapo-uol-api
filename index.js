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
    } catch {
        res.status(422).send("Erro ao cadastrar");
    }
});

app.get('/participants', async (req, res) => {
    try {
        const response = await database.collection("participants").find({}).toArray();
        console.log(response);
        res.send(response);
    } catch(err) {
        console.log("deu erro get/participans");
        res.send("Erro ao buscar participantes");
    }
});

// post e get para enviar mensagens
app.post('/messages', async (req, res) => {
    const {to, text, type} = req.body;
    console.log('body da mensagem', to, text, type);
    const user = req.headers.user;
    const message = {
        from: user, 
        to, 
        text, 
        type, 
        time: dayjs().format('HH:mm:ss')
    };
    const schema = joi.object({
        from: joi.string().required(),
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required(),
        time: joi.string().required()
    });
    const validation = schema.validate(message);
    const validateType = (type === 'message' || type === 'private_message');
    if (validation.error || !validateType) {
        console.log('Erro de validação');
        res.status(422).send('Erro de validação');
        return;
    }

    try {
        const checkName = await database.collection('participants').findOne({name: user});
        if (!checkName) {
            res.status(422).send('Participante não cadastrado');
            console.log('Participante não cadastrado');
            return;
        }
        await database.collection('messages').insertOne(message);
        console.log(message);
        res.status(201);
    } catch {
        res.status(422).send("Erro ao enviar mensagem");
    }
});

app.get('/messages', async (req, res) => {
    const user = req.headers.user
    const limit = parseInt(req.query.limit);
    console.log(limit);

    try {
        const showMessages = await database.collection('messages').find({$or:[{to:'Todos'}, {from:user}, {to:user}]}).toArray();
        console.log(showMessages);

        limit ? res.send(showMessages.slice(- limit)) : res.send(showMessages); 
    } catch(err) {
        console.log("deu erro get/messages");
        res.send("Erro ao buscar mensagens" + err);
    }
});

// post do status
app.post('/status', async (req, res) => {
    const user = req.headers.user;
    try {
        const checkParticipant = await database.collection('participants').findOne({name: user});
        if (!checkParticipant) {
            console.log('Participante não cadastrado');
            res.sendStatus(404);
        }
        await dbParticipants.updateOne(
            {name: user},
            {$set: {lastStatus: Date.now()}}
        );
        res.send(200);
    } catch {
        res.send('Erro ao buscar participante');
    }
});

// remoçao de usuarios inativos
setInterval(async () => {
    try{
        let active = await database.collection('participants').find().toArray();
        active.forEach(async (participant) => {
            const time = Date.now()
            let timeDifference = time - participant.lastStatus
            if (timeDifference > 10000){
                await database.collection('participants').deleteOne({name: participant.name});
                await database.collection('message').insertOne({
                    from: participant.name, 
                    to: 'Todos', 
                    text: 'sai da sala...', 
                    type: 'status', 
                    time: dayjs().format('HH:mm:ss')
                });
            }
        });
    }catch (err){
        res.send(err);
    }
}, 15000)

app.listen(5000);