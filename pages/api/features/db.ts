// @ts-nocheck
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

const pools = {
    central: mysql.createPool(dbConfigs.central),
    node1: mysql.createPool(dbConfigs.node1),
    node2: mysql.createPool(dbConfigs.node2)
}

export async function getConnection(node: string) {
    return await pools[node].getConnection()
}

export async function releaseConnection(connection: mysql.PoolConnection) {
    connection.release()
}

export function getRelevantNodes(releaseYear: number): string[] {
    const nodes = ['central']
    if (releaseYear < 2010) {
        nodes.push('node1')
    } else {
        nodes.push('node2')
    }
    return nodes
}

export async function executeTransaction(nodes: string[], queries: string[], params: any[][], nodeStatus: any) {
    const connections = {}
    let results = []

    try {
        // Acquire connections
        for (const node of nodes) {
            if (nodeStatus[node]) {
                connections[node] = await getConnection(node)
                await connections[node].beginTransaction()
            }
        }

        // Execute queries
        for (let i = 0; i < queries.length; i++) {
            for (const node of nodes) {
                if (nodeStatus[node]) {
                    const [result] = await connections[node].execute(queries[i], params[i])
                    results.push(result)
                }
            }
        }

        // Commit transactions
        for (const node of nodes) {
            if (nodeStatus[node]) {
                await connections[node].commit()
            }
        }

        return results
    } catch (error) {
        // Rollback transactions
        for (const node of nodes) {
            if (connections[node]) {
                await connections[node].rollback()
            }
        }
        throw error
    } finally {
        // Release connections
        for (const node of nodes) {
            if (connections[node]) {
                releaseConnection(connections[node])
            }
        }
    }
}