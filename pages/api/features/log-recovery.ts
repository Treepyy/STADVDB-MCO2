import { serialize, parse } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

interface LogEntry {
    nodes: string[];
    query: string;
    params: any[];
}

class TransactionLog {
    private log: LogEntry[] = [];

    addEntry(entry: LogEntry) {
        this.log.push(entry);
    }

    getEntriesForNode(node: string): LogEntry[] {
        return this.log.filter(entry => entry.nodes.includes(node));
    }

    clear() {
        this.log = [];
    }

    getLogForCookie() {
        return JSON.stringify(this.log);
    }

    loadFromCookie(req: NextApiRequest) {
        const cookies = parse(req.headers.cookie || '');
        const logCookie = cookies.transactionLog;
        if (logCookie) {
            this.log = JSON.parse(logCookie);
        }
    }
}

const transactionLog = new TransactionLog();

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
};

const pools = {
    central: mysql.createPool(dbConfigs.central),
    node1: mysql.createPool(dbConfigs.node1),
    node2: mysql.createPool(dbConfigs.node2)
};

async function getConnection(node: string) {
    // @ts-ignore
    return await pools[node].getConnection();
}

async function releaseConnection(connection: mysql.PoolConnection) {
    connection.release();
}

export async function executeWithLogging(nodes: string[], queries: string[], params: any[][], nodeStatus: any, isolationLevel: string = 'READ COMMITTED') {
    const results = [];
    for (let i = 0; i < queries.length; i++) {
        const entry: LogEntry = { nodes, query: queries[i], params: params[i] };
        transactionLog.addEntry(entry);

        for (const node of nodes) {
            if (nodeStatus[node]) {
                const conn = await getConnection(node);
                try {
                    await conn.execute(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
                    await conn.beginTransaction();
                    console.log(`ISOLATION LEVEL: ${isolationLevel} in ${node}`);
                    const [result] = await conn.execute(queries[i], params[i]);
                    await conn.commit();
                    results.push(result);
                } catch (error) {
                    await conn.rollback();
                    console.error(`Error executing query on ${node}:`, error);
                    throw error;
                } finally {
                    releaseConnection(conn);
                }
            }
        }
    }

    return results;
}

export async function executeStoredTransactions(node: string, req: NextApiRequest) {
    transactionLog.loadFromCookie(req);
    const entries = transactionLog.getEntriesForNode(node);
    const conn = await getConnection(node);

    try {
        await conn.beginTransaction();

        for (const entry of entries) {
            await conn.execute(entry.query, entry.params);
        }

        await conn.commit();
        console.log(`Stored transactions executed for node: ${node}`);
        console.log("Transactions: " + JSON.stringify(transactionLog.getEntriesForNode(node)));

        // Clear executed transactions from the log
        transactionLog.clear();
    } catch (error) {
        await conn.rollback();
        console.error(`Failed to execute stored transactions for node: ${node}`, error);
        throw error;
    } finally {
        releaseConnection(conn);
    }
}

export function getRelevantNodes(releaseYear: number): string[] {
    const nodes = ['central'];
    if (releaseYear < 2010) {
        nodes.push('node1');
    } else {
        nodes.push('node2');
    }
    return nodes;
}

export function getLogForCookie() {
    return transactionLog.getLogForCookie();
}

export async function recoverNode(node: string) {
    const entries = transactionLog.getEntriesForNode(node);
    const conn = await getConnection(node);

    try {
        await conn.beginTransaction();

        for (const entry of entries) {
            await conn.execute(entry.query, entry.params);
        }

        await conn.commit();
        console.log(`Recovery completed for node: ${node}`);
    } catch (error) {
        await conn.rollback();
        console.error(`Recovery failed for node: ${node}`, error);
        throw error;
    } finally {
        releaseConnection(conn);
    }
}