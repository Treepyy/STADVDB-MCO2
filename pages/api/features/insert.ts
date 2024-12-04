import { NextApiRequest, NextApiResponse } from 'next';
import { executeWithLogging, executeStoredTransactions, getRelevantNodes } from './log-recovery';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { game, nodeStatus } = req.body;
            const releaseYear = parseInt(game.release_year);
            const relevantNodes = getRelevantNodes(releaseYear);

            const query = `
        INSERT INTO games (name, req_age, price, mc_score, release_year, release_month, release_day)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
            const params = [
                game.name,
                parseInt(game.req_age),
                parseFloat(game.price),
                parseInt(game.mc_score),
                releaseYear,
                parseInt(game.release_month),
                parseInt(game.release_day)
            ];

            await executeWithLogging(relevantNodes, [query], [params], nodeStatus, "SERIALIZABLE");

            res.status(200).json({ message: 'Game inserted successfully' });
        } catch (error) {
            console.error('Error inserting game:', error);
            res.status(500).json({ error: 'Error inserting game' });
        }
    } else if (req.method === 'PUT') {
        try {
            const { node } = req.body;
            await executeStoredTransactions(node, req);

            // clear cookie after execution
            res.setHeader('Set-Cookie', serialize('transactionLog', '', { path: '/', httpOnly: true, maxAge: -1 }));

            res.status(200).json({ message: 'Stored transactions executed successfully' });
        } catch (error) {
            console.error('Error executing stored transactions:', error);
            res.status(500).json({ error: 'Error executing stored transactions' });
        }
    } else {
        res.setHeader('Allow', ['POST', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}