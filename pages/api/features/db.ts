
import mysql from 'mysql2/promise'
import { executeWithLogging } from './log-recovery'

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
    // @ts-ignore
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

export async function getMaxGameId(node: string): Promise<number> {
    const conn = await getConnection(node)
    try {
        const [result] = await conn.execute('SELECT MAX(game_id) as maxId FROM games')
        return (result as any)[0].maxId + 1
    } finally {
        await conn.release()
    }
}

export async function getYear(node: string, id: number): Promise<number> {
    const conn = await getConnection(node)
    try {
        const [result] = await conn.execute(`SELECT release_year FROM games WHERE game_id = ${id}`)
        return (result as any)[0].release_year
    } finally {
        await conn.release()
    }
}

export { executeWithLogging }