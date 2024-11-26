'use client'
// eslint-disable @typescript-eslint/no-explicit-any

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export default function DistributedDatabaseSimulator() {
  const [activeTab, setActiveTab] = useState('transactions')
  const [transactionLogs, setTransactionLogs] = useState({
    case1: [],
    case2: [],
    case3: []
  })
  const [crashLogs, setCrashLogs] = useState({
    case1: [],
    case2: [],
    case3: [],
    case4: []
  })

  // @ts-ignore
  const simulateTransaction = (caseNumber, operation) => {
    const nodes = ['Central Node', 'Node 2', 'Node 3']
    const games = ['Half-Life', 'Portal', 'Team Fortress 2']
    const game = games[Math.floor(Math.random() * games.length)]

    // @ts-ignore
    const newLogs = []
    nodes.forEach((node, index) => {
      if (caseNumber === 1 || (caseNumber === 2 && index === 0) || caseNumber === 3) {
        newLogs.push(`${node}: ${operation} on ${game}`)
      }
    })

    setTransactionLogs(prev => ({
      ...prev, // @ts-ignore
      [`case${caseNumber}`]: [...prev[`case${caseNumber}`], ...newLogs]
    }))
  }

  // @ts-ignore
  const simulateCrash = (caseNumber) => {
    const scenarios = [
      'Central Node unavailable, then recovers',
      'Node 2 unavailable, then recovers',
      'Failure writing to Central Node',
      'Failure writing to Node 2'
    ]
    const scenario = scenarios[caseNumber - 1]
    const newLog = `Simulating: ${scenario}`

    setCrashLogs(prev => ({
      ...prev,
      // @ts-ignore
      [`case${caseNumber}`]: [...prev[`case${caseNumber}`], newLog]
    }))

    // Simulate recovery after 3 seconds
    setTimeout(() => {
      const recoveryLog = `Recovery complete for: ${scenario}`
      setCrashLogs(prev => ({
        ...prev,
        // @ts-ignore
        [`case${caseNumber}`]: [...prev[`case${caseNumber}`], recoveryLog]
      }))
    }, 3000)
  }

  return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Distributed Database Simulator</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="transactions">Concurrent Transactions</TabsTrigger>
            <TabsTrigger value="crashes">Global Crash and Recovery</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Case #1: Concurrent Read Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => simulateTransaction(1, 'READ')} className="mb-2">Simulate Read</Button>
                <div className="bg-gray-100 p-2 rounded">
                  {transactionLogs.case1.map((log, index) => (
                      <p key={index}>{log}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Case #2: One Write, Others Read</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => simulateTransaction(2, 'WRITE')} className="mb-2">Simulate Write/Read</Button>
                <div className="bg-gray-100 p-2 rounded">
                  {transactionLogs.case2.map((log, index) => (
                      <p key={index}>{log}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Case #3: Concurrent Write Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => simulateTransaction(3, 'WRITE')} className="mb-2">Simulate Write</Button>
                <div className="bg-gray-100 p-2 rounded">
                  {transactionLogs.case3.map((log, index) => (
                      <p key={index}>{log}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="crashes">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Case #1: Central Node Unavailable</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => simulateCrash(1)} className="mb-2">Simulate Crash</Button>
                <div className="bg-gray-100 p-2 rounded">
                  {crashLogs.case1.map((log, index) => (
                      <p key={index}>{log}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Case #2: Node 2 or 3 Unavailable</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => simulateCrash(2)} className="mb-2">Simulate Crash</Button>
                <div className="bg-gray-100 p-2 rounded">
                  {crashLogs.case2.map((log, index) => (
                      <p key={index}>{log}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Case #3: Failure Writing to Central Node</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => simulateCrash(3)} className="mb-2">Simulate Crash</Button>
                <div className="bg-gray-100 p-2 rounded">
                  {crashLogs.case3.map((log, index) => (
                      <p key={index}>{log}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Case #4: Failure Writing to Node 2 or 3</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => simulateCrash(4)} className="mb-2">Simulate Crash</Button>
                <div className="bg-gray-100 p-2 rounded">
                  {crashLogs.case4.map((log, index) => (
                      <p key={index}>{log}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}