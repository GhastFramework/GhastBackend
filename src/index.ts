
import express, {Express, Request, Response, Application, NextFunction} from 'express';
import dotenv from 'dotenv';

//For env File
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) return res.sendStatus(401);

    if (token !== process.env.API_KEY) return res.sendStatus(403);

    next();
};

import notesMiddleware from './routers/notes';
import twitterMiddleware from './routers/twitter';


// @ts-ignore
app.use(authenticateToken);
app.use(express.json())

// Register the routers!
app.use('/api', notesMiddleware)
app.use('/api', twitterMiddleware)

app.get('/', (req: Request, res: Response) => {
    res.send('Ghast Framework Backend is running!');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
