import { NextApiRequest, NextApiResponse } from 'next'
import { executeWithLogging, getRelevantNodes, getYear } from './db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'PUT') {
        try {
            const { game, nodeStatus } = req.body
            const releaseYear = await getYear("central", game.game_id)
            const relevantNodes = getRelevantNodes(releaseYear)

            const query = `
                UPDATE games
                SET price = ?
                WHERE game_id = ?
            `
            const params = [
                parseFloat(game.price),
                parseInt(game.game_id)
            ]

            await executeWithLogging(relevantNodes, [query], [params], nodeStatus)

            res.status(200).json({ message: 'Game updated successfully' })
        } catch (error) {
            console.error('Error updating game:', error)
            res.status(500).json({ error: 'Error updating game' })
        }
    } else {
        res.setHeader('Allow', ['PUT'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}