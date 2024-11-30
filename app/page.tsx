'use client'

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

  const simulateTransaction = async (caseNumber: number) => {
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ case: caseNumber }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      setTransactionLogs(prev => ({
        ...prev,
        [`case${caseNumber}`]: data.logs
      }))
    } catch (error) {
      console.error('Error:', error)
      setTransactionLogs(prev => ({
        ...prev,
        [`case${caseNumber}`]: ['Error occurred during simulation']
      }))
    }
  }

  const simulateCrash = async (caseNumber: number) => {
    try {
      const response = await fetch('/api/failure-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ case: caseNumber }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      setCrashLogs(prev => ({
        ...prev,
        [`case${caseNumber}`]: data.logs
      }))
    } catch (error) {
      console.error('Error:', error)
      setCrashLogs(prev => ({
        ...prev,
        [`case${caseNumber}`]: ['Error occurred during simulation']
      }))
    }
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
                <Button onClick={() => simulateTransaction(1)} className="mb-2">Simulate Case 1</Button>
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
                <Button onClick={() => simulateTransaction(2)} className="mb-2">Simulate Case 2</Button>
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
                <Button onClick={() => simulateTransaction(3)} className="mb-2">Simulate Case 3</Button>
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