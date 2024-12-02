// @ts-nocheck
"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DistributedDatabaseSimulator() {
  const [concurrencyLogs, setConcurrencyLogs] = useState({})
  const [crashLogs, setCrashLogs] = useState({})
  const [gameData, setGameData] = useState({
    name: '',
    release_year: '',
    req_age: '',
    price: '',
    mc_score: '',
    release_month: '',
    release_day: ''
  })
  const [concurrencyInput, setConcurrencyInput] = useState({
    gameId: '',
    price: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setGameData(prev => ({ ...prev, [name]: value }))
  }

  const handleConcurrencyInputChange = (e) => {
    const { name, value } = e.target
    setConcurrencyInput(prev => ({ ...prev, [name]: value }))
  }

  const simulateConcurrency = async (caseNumber) => {
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case: caseNumber,
          gameId: parseInt(concurrencyInput.gameId),
          price: parseFloat(concurrencyInput.price)
        }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      setConcurrencyLogs(prev => ({
        ...prev,
        [`case${caseNumber}`]: data.logs
      }))
    } catch (error) {
      console.error('Error:', error)
      setConcurrencyLogs(prev => ({
        ...prev,
        [`case${caseNumber}`]: ['Error occurred during simulation']
      }))
    }
  }

  const simulateCrash = async (caseNumber) => {
    try {
      const response = await fetch('/api/failure-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ case: caseNumber, gameData }),
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

  const router = useRouter();
  return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Distributed Database Simulator</h1>
        <div className="mb-4">
          <Button onClick={() => router.push('/features')}>Go to Features</Button>
        </div>
        <Tabs defaultValue="concurrency">
          <TabsList>
            <TabsTrigger value="concurrency">Concurrency Control</TabsTrigger>
            <TabsTrigger value="crash">Crash Recovery</TabsTrigger>
          </TabsList>
          <TabsContent value="concurrency">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gameId">Game ID</Label>
                  <Input
                      id="gameId"
                      name="gameId"
                      type="number"
                      value={concurrencyInput.gameId}
                      onChange={handleConcurrencyInputChange}
                      required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={concurrencyInput.price}
                      onChange={handleConcurrencyInputChange}
                      required
                  />
                </div>
              </div>
              <hr/>
              <Label>Case #1: Concurrent transactions in two or more nodes are reading the same data item.</Label><br/>
              <Button onClick={() => simulateConcurrency(1)}>Simulate Case 1</Button>
              <br/><br/>
              <Label>Case #2: At least one transaction in the three nodes is writing (update / delete) and the other concurrent transactions are reading the same data item.</Label><br/>
              <Button onClick={() => simulateConcurrency(2)}>Simulate Case 2</Button>
              <br/><br/>
              <Label>Case #3: Concurrent transactions in two or more nodes are writing (update / delete) the same data item.</Label><br/>
              <Button onClick={() => simulateConcurrency(3)}>Simulate Case 3</Button>
              <br/>
              {Object.entries(concurrencyLogs).map(([key, logs]) => (
                  <div key={key}>
                    <h3 className="font-bold">{key}</h3>
                    <pre className="bg-gray-100 p-2 rounded">{logs.join('\n')}</pre>
                  </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="crash">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Game Name</Label>
                  <Input id="name" name="name" value={gameData.name} onChange={handleInputChange} required/>
                </div>
                <div>
                  <Label htmlFor="release_year">Release Year</Label>
                  <Input id="release_year" name="release_year" type="number" value={gameData.release_year}
                         onChange={handleInputChange} required/>
                </div>
                <div>
                  <Label htmlFor="req_age">Required Age</Label>
                  <Input id="req_age" name="req_age" type="number" value={gameData.req_age}
                         onChange={handleInputChange}/>
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" type="number" step="0.01" value={gameData.price}
                         onChange={handleInputChange}/>
                </div>
                <div>
                  <Label htmlFor="mc_score">Metacritic Score</Label>
                  <Input id="mc_score" name="mc_score" type="number" value={gameData.mc_score}
                         onChange={handleInputChange}/>
                </div>
                <div>
                  <Label htmlFor="release_month">Release Month</Label>
                  <Input id="release_month" name="release_month" type="number" min="1" max="12"
                         value={gameData.release_month} onChange={handleInputChange}/>
                </div>
                <div>
                  <Label htmlFor="release_day">Release Day</Label>
                  <Input id="release_day" name="release_day" type="number" min="1" max="31" value={gameData.release_day}
                         onChange={handleInputChange}/>
                </div>
              </div>
              <hr/>
              <Label>Case #1: The central node is unavailable during the execution of a transaction and then eventually comes back online</Label><br/>
              <Button onClick={() => simulateCrash(1)}>Simulate Case 1</Button>
              <br/><br/>
              <Label>Case #2: Node 2 or Node 3 is unavailable during the execution of a transaction and then eventually comes back online</Label><br/>
              <Button onClick={() => simulateCrash(2)}>Simulate Case 2</Button>
              <br/><br/>
              <Label>Case #3: Failure in writing to the central node when attempting to replicate the transaction from Node 1 or Node 2</Label><br/>
              <Button onClick={() => simulateCrash(3)}>Simulate Case 3</Button>
              <br/><br/>
              <Label>Case #4: Failure in writing to Node 2 or Node 3 when attempting to replicate the transaction from the central node</Label><br/>
              <Button onClick={() => simulateCrash(4)}>Simulate Case 4</Button>
              <br/><br/>
              {Object.entries(crashLogs).map(([key, logs]) => (
                  <div key={key}>
                    <h3 className="font-bold">{key}</h3>
                    <pre className="bg-gray-100 p-2 rounded">{logs.join('\n')}</pre>
                  </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
  )
}