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

class TransactionLog {
    private pendingTransactions: Record<string, any> = {}
    private completedTransactions: Record<string, any> = {}

    addPending(txId: string, nodes: string[], query: string, params: any[]) {
        this.pendingTransactions[txId] = {
            nodes: new Set(nodes),
            query,
            params,
            status: 'pending',
            completedNodes: new Set(),
            timestamp: Date.now()
        }
    }

    markCompleted(txId: string, node: string) {
        if (this.pendingTransactions[txId]) {
            const tx = this.pendingTransactions[txId]
            tx.completedNodes.add(node)
            if (tx.completedNodes.size === tx.nodes.size) {
                this.completedTransactions[txId] = { ...tx }
                delete this.pendingTransactions[txId]
            }
        }
    }

    getPendingForNode(node: string) {
        return Object.entries(this.pendingTransactions)
            .filter(([_, tx]) => tx.nodes.has(node) && !tx.completedNodes.has(node))
            .reduce((acc, [txId, tx]) => ({ ...acc, [txId]: tx }), {})
    }
}

const transactionLog = new TransactionLog()

async function getDbConnection(config: any) {
    return await mysql.createConnection(config)
}

async function executeSafeQuery(node: string, query: string, params: any[]) {
    const conn = await getDbConnection(dbConfigs[node])
    try {
        await conn.execute(query, params)
        return true
    } catch (error) {
        console.error(`Query execution failed on ${node}:`, error)
        return false
    } finally {
        await conn.end()
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

async function simulateNodeFailure(node: string) {
    try {
        const conn = await getDbConnection(dbConfigs[node])
        await conn.end()
        return `Node ${node} simulated failure`
    } catch (error) {
        return `Error simulating failure for ${node}: ${error.message}`
    }
}

async function simulateNodeRecovery(node: string, txId: string | null = null) {
    const maxRetries = 3
    const retryDelay = 2000

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const conn = await getDbConnection(dbConfigs[node])
            if (conn) {
                const recoveryResults = await recoverNode(node)
                await conn.end()
                return `Node ${node} recovered successfully: ${recoveryResults.join('; ')}`
            }
        } catch (error) {
            console.error(`Recovery attempt ${attempt + 1} failed:`, error)
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay))
    }

    return `Failed to recover node ${node} after ${maxRetries} attempts`
}

async function recoverNode(node: string) {
    const pendingTxs = transactionLog.getPendingForNode(node)
    const results = []

    for (const [txId, tx] of Object.entries(pendingTxs)) {
        const success = await executeSafeQuery(node, tx.query, tx.params)
        if (success) {
            transactionLog.markCompleted(txId, node)
            results.push(`Recovered transaction ${txId} on ${node}`)
        } else {
            results.push(`Failed to recover transaction ${txId} on ${node}`)
        }
    }

    return results
}

async function getMaxGameId(node: string): Promise<number> {
    const conn = await getDbConnection(dbConfigs[node])
    try {
        const [result] = await conn.execute('SELECT MAX(game_id) as maxId FROM games')
        return (result as any)[0].maxId + 1
    } finally {
        await conn.end()
    }
}

async function failRecover1(gameData: any) {
    const logs = []
    const txId = Date.now().toString()

    try {
        const maxGameId = await getMaxGameId('central')
        const query = "INSERT INTO games (game_id, name, release_year, req_age, price, mc_score, release_month, release_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        const releaseYear = gameData.release_year
        const params = [maxGameId, gameData.name, releaseYear, gameData.req_age, gameData.price, gameData.mc_score, gameData.release_month, gameData.release_day]
        const relevantNodes = getRelevantNodes(releaseYear)

        logs.push(`Starting transaction across nodes: ${relevantNodes.join(', ')}... with params ${params.join(', ')}`)

        logs.push("Simulating central node failure...")
        logs.push(await simulateNodeFailure('central'))

        transactionLog.addPending(txId, relevantNodes, query, params)
        logs.push(`Transaction ${txId} added to pending log`)

        logs.push(`Executing transaction on available nodes (${relevantNodes.filter(n => n !== 'central').join(', ')})...`)
        for (const node of relevantNodes.filter(n => n !== 'central')) {
            const success = await executeSafeQuery(node, query, params)
            if (success) {
                transactionLog.markCompleted(txId, node)
                logs.push(`Transaction completed successfully on ${node}`)
            } else {
                logs.push(`Transaction failed on ${node}`)
            }
        }

        logs.push("Attempting to recover central node...")
        const recoveryResult = await simulateNodeRecovery('central', txId)
        logs.push(recoveryResult)

        if (recoveryResult.includes("recovered successfully")) {
            const success = await executeSafeQuery('central', query, params)
            if (success) {
                logs.push("Data successfully synced to central node")
                transactionLog.markCompleted(txId, 'central')
            }
        }

        logs.push("Verifying final state...")
        for (const node of relevantNodes) {
            const conn = await getDbConnection(dbConfigs[node])
            const [rows] = await conn.execute("SELECT * FROM games WHERE game_id = ?", [maxGameId])
            logs.push(`Data on ${node}: ${rows ? 'Present' : 'Not present'}`)
            if (!rows) {
                const success = await executeSafeQuery(node, query, params)
                if (success) {
                    logs.push(`Data resynced to ${node}`)
                }
            }
            await conn.end()
        }
    } catch (error) {
        // @ts-ignore
        logs.push(`Error in case 1: ${error.message}`)
    }

    return logs
}

async function failRecover2(gameData: any) {
    const logs = []
    const txId = Date.now().toString()

    try {
        const maxGameId = await getMaxGameId('central')
        const query = "INSERT INTO games (game_id, name, release_year, req_age, price, mc_score, release_month, release_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        const releaseYear = gameData.release_year
        const params = [maxGameId, gameData.name, releaseYear, gameData.req_age, gameData.price, gameData.mc_score, gameData.release_month, gameData.release_day]
        const relevantNodes = getRelevantNodes(releaseYear)

        logs.push(`Starting transaction across nodes: ${relevantNodes.join(', ')}...`)

        logs.push("Simulating node2 failure...")
        logs.push(await simulateNodeFailure('node2'))

        transactionLog.addPending(txId, relevantNodes, query, params)
        logs.push(`Transaction ${txId} added to pending log`)

        logs.push(`Executing transaction on available nodes (${relevantNodes.filter(n => n !== 'node2').join(', ')})...`)
        for (const node of relevantNodes.filter(n => n !== 'node2')) {
            const success = await executeSafeQuery(node, query, params)
            if (success) {
                transactionLog.markCompleted(txId, node)
                logs.push(`Transaction completed successfully on ${node}`)
            } else {
                logs.push(`Transaction failed on ${node}`)
            }
        }

        logs.push("Attempting to recover node2...")
        logs.push(await simulateNodeRecovery('node2', txId))

        logs.push("Verifying final state...")
        for (const node of relevantNodes) {
            const conn = await getDbConnection(dbConfigs[node])
            const [rows] = await conn.execute("SELECT * FROM games WHERE game_id = ?", [maxGameId])
            logs.push(`Data on ${node}: ${rows ? 'Present' : 'Not present'}`)
            await conn.end()
        }
    } catch (error) {
        // @ts-ignore
        logs.push(`Error in case 2: ${error.message}`)
    }

    return logs
}

async function failRecover3(gameData: any) {
    const logs = []
    const txId = Date.now().toString()

    try {
        const maxGameId = await getMaxGameId('central')
        const query = "INSERT INTO games (game_id, name, release_year, req_age, price, mc_score, release_month, release_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        const releaseYear = gameData.release_year
        const params = [maxGameId, gameData.name, releaseYear, gameData.req_age, gameData.price, gameData.mc_score, gameData.release_month, gameData.release_day]
        const relevantNodes = getRelevantNodes(releaseYear)

        logs.push(`Starting transaction on node1...`)

        const success = await executeSafeQuery('node1', query, params)
        if (success) {
            logs.push("Transaction completed successfully on node1")

            logs.push("Simulating central node failure during replication...")
            logs.push(await simulateNodeFailure('central'))

            transactionLog.addPending(txId, ['central'], query, params)
            logs.push(`Transaction ${txId} added to pending log for central`)

            logs.push("Attempting to recover central node...")
            logs.push(await simulateNodeRecovery('central', txId))

            logs.push("Verifying final state...")
            for (const node of relevantNodes) {
                const conn = await getDbConnection(dbConfigs[node])
                const [rows] = await conn.execute("SELECT * FROM games WHERE game_id = ?", [maxGameId])
                logs.push(`Data on ${node}: ${rows ? 'Present' : 'Not present'}`)
                await conn.end()
            }
        } else {
            logs.push("Initial transaction failed on node1")
        }
    } catch (error) {
        // @ts-ignore
        logs.push(`Error in case 3: ${error.message}`)
    }

    return logs
}

async function failRecover4(gameData: any) {
    const logs = []
    const txId = Date.now().toString()

    try {
        const maxGameId = await getMaxGameId('central')
        const query = "INSERT INTO games (game_id, name, release_year, req_age, price, mc_score, release_month, release_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        const releaseYear = gameData.release_year
        const params = [maxGameId, gameData.name, releaseYear, gameData.req_age, gameData.price, gameData.mc_score, gameData.release_month, gameData.release_day]
        const relevantNodes = getRelevantNodes(releaseYear)

        logs.push("Starting transaction on central node...")

        const success = await executeSafeQuery('central', query, params)
        if (success) {
            logs.push("Transaction completed successfully on central")

            logs.push("Simulating node2 failure during replication...")
            logs.push(await simulateNodeFailure('node2'))

            transactionLog.addPending(txId, ['node2'], query, params)
            logs.push(`Transaction ${txId} added to pending log for node2`)

            logs.push("Attempting to recover node2...")
            logs.push(await simulateNodeRecovery('node2', txId))

            logs.push("Verifying final state...")
            for (const node of relevantNodes) {
                // @ts-ignore
                const conn = await getDbConnection(dbConfigs[node])
                const [rows] = await conn.execute("SELECT * FROM games WHERE game_id = ?", [maxGameId])
                logs.push(`Data on ${node}: ${rows ? 'Present' : 'Not present'}`)
                await conn.end()
            }
        } else {
            logs.push("Initial transaction failed on central")
        }
    } catch (error) {
        // @ts-ignore
        logs.push(`Error in case 4: ${error.message}`)
    }

    return logs
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { case: caseNumber, gameData } = req.body

        try {
            let logs
            switch (caseNumber) {
                case 1:
                    logs = await failRecover1(gameData)
                    break
                case 2:
                    logs = await failRecover2(gameData)
                    break
                case 3:
                    logs = await failRecover3(gameData)
                    break
                case 4:
                    logs = await failRecover4(gameData)
                    break
                default:
                    return res.status(400).json({ error: 'Invalid case number' })
            }
            res.status(200).json({ logs })
        } catch (error) {
            console.error('Error in failure recovery simulation:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    } else {
        res.setHeader('Allow', ['POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}