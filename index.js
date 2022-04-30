import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json()); 
app.use(cors());

let users = [];

app.post('/participants', (req, res) => {
    const body = req.body;
    console.log('body do cadastro', body);

    const userData = {
        name: body.name
    }
    users.push(userData);
    res.send('Ok');
    console.log('users', users);
});

app.listen(5000);