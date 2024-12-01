import { NextApiRequest, NextApiResponse } from 'next'
import { executeTransaction, getRelevantNodes } from './db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'PUT') {
        try {
            const { game, nodeStatus } = req.body
            const releaseYear = parseInt(game.release_year)
            const relevantNodes = getRelevantNodes(releaseYear)

            const query = `
        UPDATE games
        SET name = ?, req_age = ?, price = ?, mc_score = ?, release_year = ?, release_month = ?, release_day = ?
        WHERE game_id = ?
      `
            const params = [
                game.name,
                parseInt(game.req_age),
                parseFloat(game.price),
                parseInt(game.mc_score),
                releaseYear,
                parseInt(game.release_month),
                parseInt(game.release_day),
                parseInt(game.game_id)
            ]

            await executeTransaction(relevantNodes, [query], [params], nodeStatus)

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