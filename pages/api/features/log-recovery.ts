// @ts-nocheck

import { getConnection, releaseConnection } from './db'

interface LogEntry {
    txId: string;
    operation: string;
    query: string;
    params: any[];
    nodes: string[];
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
}

const transactionLog = new TransactionLog();

export async function logOperation(txId: string, operation: string, query: string, params: any[], nodes: string[]) {
    transactionLog.addEntry({ txId, operation, query, params, nodes });
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

export async function executeWithLogging(nodes: string[], queries: string[], params: any[][], nodeStatus: any) {
    const txId = Date.now().toString();
    const connections = {};
    let results = [];

    try {
        // Acquire connections and begin transactions
        for (const node of nodes) {
            if (nodeStatus[node]) {
                connections[node] = await getConnection(node);
                await connections[node].beginTransaction();
            }
        }

        // Execute queries and log operations
        for (let i = 0; i < queries.length; i++) {
            for (const node of nodes) {
                if (nodeStatus[node]) {
                    const [result] = await connections[node].execute(queries[i], params[i]);
                    results.push(result);
                    await logOperation(txId, 'execute', queries[i], params[i], [node]);
                }
            }
        }

        // Commit transactions
        for (const node of nodes) {
            if (nodeStatus[node]) {
                await connections[node].commit();
                await logOperation(txId, 'commit', '', [], [node]);
            }
        }

        return results;
    } catch (error) {
        // Rollback transactions and log rollbacks
        for (const node of nodes) {
            if (connections[node]) {
                await connections[node].rollback();
                await logOperation(txId, 'rollback', '', [], [node]);
            }
        }
        throw error;
    } finally {
        // Release connections
        for (const node of nodes) {
            if (connections[node]) {
                releaseConnection(connections[node]);
            }
        }
    }
}