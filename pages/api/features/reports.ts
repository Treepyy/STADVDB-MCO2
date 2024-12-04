import { NextApiRequest, NextApiResponse } from 'next'
import { getConnection, releaseConnection, recoverNode } from './db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const { nodeStatus } = req.query
            const parsedNodeStatus = JSON.parse(nodeStatus as string)

            const report1Query = `
                SELECT name, price
                FROM games
                WHERE price IS NOT NULL
                ORDER BY price DESC
                    LIMIT 10
            `

            const report2Query = `
                SELECT release_year, AVG(mc_score) as avg_score
                FROM games
                WHERE mc_score IS NOT NULL AND mc_score > 0
                GROUP BY release_year
                ORDER BY release_year
            `

            let report1 = ''
            let report2 = ''

            // Generate reports from central node
            if (parsedNodeStatus.central) {
                const centralConn = await getConnection('central')
                try {
                    const [rows1] = await centralConn.execute(report1Query)
                    report1 = formatReport1(rows1)

                    const [rows2] = await centralConn.execute(report2Query)
                    report2 = formatReport2(rows2)
                } catch (error) {
                    console.error('Error querying central node:', error)
                    await recoverNode('central')
                } finally {
                    releaseConnection(centralConn)
                }
            }

            // If reports are empty, try other nodes
            if (!report1 || !report2) {
                const otherNodes = ['node1', 'node2']
                for (const node of otherNodes) {
                    if (parsedNodeStatus[node] && (!report1 || !report2)) {
                        const conn = await getConnection(node)
                        try {
                            if (!report1) {
                                const [rows1] = await conn.execute(report1Query)
                                report1 = formatReport1(rows1)
                            }
                            if (!report2) {
                                const [rows2] = await conn.execute(report2Query)
                                report2 = formatReport2(rows2)
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

            res.status(200).json({ report1, report2 })
        } catch (error) {
            console.error('Error generating reports:', error)
            res.status(500).json({ error: 'Error generating reports' })
        }
    } else {
        res.setHeader('Allow', ['GET'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}

function formatReport1(rows: any[]) {
    return rows.map((row, index) =>
        `${index + 1}. ${row.name} (Price: ${row.price})`
    ).join('\n')
}

function formatReport2(rows: any[]) {
    return rows.map(row =>
        `${row.release_year}: ${row.avg_score}`
    ).join('\n')
}