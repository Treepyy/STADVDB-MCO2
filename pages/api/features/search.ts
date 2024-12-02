import { NextApiRequest, NextApiResponse } from 'next'
import { getConnection, releaseConnection, recoverNode } from './db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const { id, nodeStatus } = req.query
            const parsedNodeStatus = JSON.parse(nodeStatus as string)
            console.log(parsedNodeStatus)

            const query = 'SELECT * FROM games WHERE game_id = ?'
            const params = [parseInt(id as string)]

            let game = null

            // Try central node first
            if (parsedNodeStatus.central) {
                const centralConn = await getConnection('central')
                try {
                    const [rows] = await centralConn.execute(query, params)
                    if (Array.isArray(rows) && rows.length > 0) {
                        game = rows[0]
                    }
                } catch (error) {
                    console.error('Error querying central node:', error)
                    await recoverNode('central')
                } finally {
                    releaseConnection(centralConn)
                }
            }

            // If not found in central, try other nodes
            if (!game) {
                const otherNodes = ['node1', 'node2']
                for (const node of otherNodes) {
                    if (parsedNodeStatus[node]) {
                        const conn = await getConnection(node)
                        try {
                            const [rows] = await conn.execute(query, params)
                            if (Array.isArray(rows) && rows.length > 0) {
                                game = rows[0]
                                break
                            }
                        } catch (error) {
                            console.error(`Error querying ${node}:`, error)
                            await recoverNode(node)
                        } finally {
                            releaseConnection(conn)
                        }
                    }
                }
            }

            if (game) {
                res.status(200).json({ game })
            } else {
                res.status(404).json({ error: 'Game not found' })
            }
        } catch (error) {
            console.error('Error searching game:', error)
            res.status(500).json({ error: 'Error searching game' })
        }
    } else {
        res.setHeader('Allow', ['GET'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}