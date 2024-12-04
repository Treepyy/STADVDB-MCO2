import { NextApiRequest, NextApiResponse } from 'next'
import { getConnection, releaseConnection, recoverNode } from './db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            // master-slave, can only read from node1 and node2 not central

            const { id, nodeStatus } = req.query
            const parsedNodeStatus = JSON.parse(nodeStatus as string)
            console.log(parsedNodeStatus)

            const query = 'SELECT * FROM games WHERE game_id = ?'
            const params = [parseInt(id as string)]

            let game = null

            // Try node1 first
            if (parsedNodeStatus.node1) {
                const conn = await getConnection('node1')
                try {
                    await conn.execute(`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
                    const [rows] = await conn.execute(query, params)
                    if (Array.isArray(rows) && rows.length > 0) {
                        game = rows[0]
                    }
                } catch (error) {
                    console.error('Error querying central node:', error)
                    await recoverNode('central')
                } finally {
                    releaseConnection(conn)
                }
            }


            // If not found, try other nodes
            if (!game) {
                if (parsedNodeStatus.node2) {
                    const centralConn = await getConnection('node2')
                    try {
                        await centralConn.execute(`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
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