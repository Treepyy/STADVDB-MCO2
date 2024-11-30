// @ts-nocheck

import { NextApiRequest, NextApiResponse } from 'next'
import mysql from 'mysql2/promise'

const dbConfigs = {
    central: {
        host: "mysql-53200c2-dlsu-7e2e.c.aivencloud.com",
        port: 21345,
        user: "avnadmin",
        password: "AVNS_JoKOZcI8ED_H53tgdek",
        database: "steam_games_node0",
    },
    node1: {
        host: "mysql-32ee4c1e-dlsu-7e2e.g.aivencloud.com",
        port: 21345,
        user: "avnadmin",
        password: "AVNS_bQKF2EAYvlr1z-SkXQR",
        database: "steam_games_node1",
    },
    node2: {
        host: "mysql-3bcc7ee1-dlsu-7e2e.g.aivencloud.com",
        port: 21345,
        user: "avnadmin",
        password: "AVNS_kd4Si3gkCPxz9pOI6iD",
        database: "steam_games_node2",
    }
}

async function getDbConnection(config: any, isolationLevel: string = 'READ COMMITTED') {
    const connection = await mysql.createConnection(config)
    await connection.execute(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`)
    return connection
}

async function executeQuery(connection: any, query: string, params: any[] = []) {
    try {
        const [results] = await connection.execute(query, params)
        return results
    } catch (error) {
        console.error('Query execution error:', error)
        throw error
    }
}

function getRelevantNodes(releaseYear: number): string[] {
    const nodes = ['central']
    if (releaseYear < 2010) {
        nodes.push('node1')
    } else {
        nodes.push('node2')
    }
    return nodes
}

async function simulateCase1() {
    const logs: string[] = []
    const releaseYear = 2008 // Example release year for Case 1
    const relevantNodes = getRelevantNodes(releaseYear)

    async function transaction1() {
        const node = relevantNodes.includes('node1') ? 'node1' : 'node2'
        logs.push(`Transaction 1 started on ${node}`)
        const conn = await getDbConnection(dbConfigs[node], 'READ COMMITTED')
        try {
            const result = await executeQuery(conn, "SELECT * FROM games WHERE game_id = 1 AND release_year = ?", [releaseYear])
            logs.push(`Transaction 1 result on ${node}: ${JSON.stringify(result)}`)
        } finally {
            await conn.end()
        }
        logs.push(`Transaction 1 completed on ${node}`)
    }

    async function transaction2() {
        logs.push("Transaction 2 started on central")
        const conn = await getDbConnection(dbConfigs.central, 'READ COMMITTED')
        try {
            const result = await executeQuery(conn, "SELECT * FROM games WHERE game_id = 1")
            logs.push(`Transaction 2 result on central: ${JSON.stringify(result)}`)
        } finally {
            await conn.end()
        }
        logs.push("Transaction 2 completed on central")
    }

    await Promise.all([transaction1(), transaction2()])
    return logs
}

async function simulateCase2() {
    const logs: string[] = []
    const releaseYear = 2015 // Example release year for Case 2
    const relevantNodes = getRelevantNodes(releaseYear)

    async function transaction1() {
        const node = relevantNodes.includes('node1') ? 'node1' : 'node2'
        logs.push(`Transaction 1 started on ${node}`)
        const conn = await getDbConnection(dbConfigs[node], 'READ COMMITTED')
        try {
            const result = await executeQuery(conn, "SELECT * FROM games WHERE game_id = 1 AND release_year = ?", [releaseYear])
            logs.push(`Transaction 1 result on ${node}: ${JSON.stringify(result)}`)
        } finally {
            await conn.end()
        }
        logs.push(`Transaction 1 completed on ${node}`)
    }

    async function transaction2() {
        logs.push("Transaction 2 started on central")
        const conn = await getDbConnection(dbConfigs.central, 'READ COMMITTED')
        try {
            await executeQuery(conn, "UPDATE games SET price = price + 1 WHERE game_id = 1 AND release_year = ?", [releaseYear])
            logs.push("Transaction 2 updated price on central")
        } finally {
            await conn.end()
        }
        logs.push("Transaction 2 completed on central")
    }

    await Promise.all([transaction1(), transaction2()])
    return logs
}

async function simulateCase3() {
    const logs = []
    const releaseYear = 2008 // Example release year for Case 3
    const relevantNodes = getRelevantNodes(releaseYear)

    async function transaction1() {
        const node = relevantNodes.includes('node1') ? 'node1' : 'node2'
        logs.push(`Transaction 1 started on ${node}`)
        const conn = await getDbConnection(dbConfigs[node], 'SERIALIZABLE')
        try {
            await executeQuery(conn, "UPDATE games SET price = price + 1 WHERE game_id = 1 AND release_year = ?", [releaseYear])
            logs.push(`Transaction 1 updated price on ${node}`)
        } finally {
            await conn.end()
        }
        logs.push(`Transaction 1 completed on ${node}`)
    }

    async function transaction2() {
        logs.push("Transaction 2 started on central")
        const conn = await getDbConnection(dbConfigs.central, 'SERIALIZABLE')
        try {
            await executeQuery(conn, "UPDATE games SET price = price + 1 WHERE game_id = 1 AND release_year = ?", [releaseYear])
            logs.push("Transaction 2 updated price on central")
        } finally {
            await conn.end()
        }
        logs.push("Transaction 2 completed on central")
    }

    await Promise.all([transaction1(), transaction2()])

    // Check final state of the database
    const finalStateLogs = []
    for (const nodeName of relevantNodes) {
        // @ts-ignore
        const conn = await getDbConnection(dbConfigs[nodeName], 'READ COMMITTED')
        try {
            const result = await executeQuery(conn, "SELECT price FROM games WHERE game_id = 1 AND release_year = ?", [releaseYear])
            finalStateLogs.push(`Result on ${nodeName}: ${JSON.stringify(result)} `)
        } finally {
            await conn.end()
        }
    }

    logs.push(...finalStateLogs)
    return logs
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { case: caseNumber } = req.body

        try {
            let logs
            switch (caseNumber) {
                case 1:
                    logs = await simulateCase1()
                    break
                case 2:
                    logs = await simulateCase2()
                    break
                case 3:
                    logs = await simulateCase3()
                    break
                default:
                    return res.status(400).json({ error: 'Invalid case number' })
            }
            res.status(200).json({ logs })
        } catch (error) {
            console.error('Error in simulation:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    } else {
        res.setHeader('Allow', ['POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}