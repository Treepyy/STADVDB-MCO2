// @ts-nocheck
"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {useRouter} from "next/navigation";

export default function FeaturesPage() {
    const [newGame, setNewGame] = useState({
        name: '',
        req_age: '',
        price: '',
        mc_score: '',
        release_year: '',
        release_month: '',
        release_day: ''
    })
    const [updateGame, setUpdateGame] = useState({
        game_id: '',
        name: '',
        req_age: '',
        price: '',
        mc_score: '',
        release_year: '',
        release_month: '',
        release_day: ''
    })
    const [searchId, setSearchId] = useState('')
    const [searchResult, setSearchResult] = useState(null)
    const [report1, setReport1] = useState('')
    const [report2, setReport2] = useState('')
    const [nodeStatus, setNodeStatus] = useState({
        central: true,
        node1: true,
        node2: true
    })

    const handleNewGameChange = (e) => {
        const { name, value } = e.target
        setNewGame(prev => ({ ...prev, [name]: value }))
    }

    const handleUpdateGameChange = (e) => {
        const { name, value } = e.target
        setUpdateGame(prev => ({ ...prev, [name]: value }))
    }

    const handleNodeStatusChange = (node) => {
        setNodeStatus(prev => ({ ...prev, [node]: !prev[node] }))
    }

    const insertGame = async () => {
        try {
            const response = await fetch('/api/features/insert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: newGame, nodeStatus })
            })
            const data = await response.json()
            alert(data.message)
        } catch (error) {
            console.error('Error inserting game:', error)
            alert('Error inserting game')
        }
    }

    const updateGameRecord = async () => {
        try {
            const response = await fetch('/api/features/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: updateGame, nodeStatus })
            })
            const data = await response.json()
            alert(data.message)
        } catch (error) {
            console.error('Error updating game:', error)
            alert('Error updating game')
        }
    }

    const searchGame = async () => {
        try {
            const response = await fetch(`/api/features/search?id=${searchId}&nodeStatus=${JSON.stringify(nodeStatus)}`)
            const data = await response.json()
            setSearchResult(data.game)
        } catch (error) {
            console.error('Error searching game:', error)
            alert('Error searching game')
        }
    }

    const generateReports = async () => {
        try {
            const response = await fetch(`/api/features/reports?nodeStatus=${JSON.stringify(nodeStatus)}`)
            const data = await response.json()
            setReport1(data.report1)
            setReport2(data.report2)
        } catch (error) {
            console.error('Error generating reports:', error)
            alert('Error generating reports')
        }
    }
    
    const router = useRouter()

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Database Features</h1>
            <div className="mb-4">
                <Button onClick={() => router.push('/')}>Go to Test Cases</Button>
            </div>
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Node Status</h2>
                <div className="flex space-x-4">
                    {['central', 'node1', 'node2'].map((node) => (
                        <div key={node} className="flex items-center space-x-2">
                            <Switch
                                id={`${node}-switch`}
                                checked={nodeStatus[node]}
                                onCheckedChange={() => handleNodeStatusChange(node)}
                            />
                            <Label htmlFor={`${node}-switch`}>{node}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <Tabs defaultValue="insert">
                <TabsList>
                    <TabsTrigger value="insert">Insert Game</TabsTrigger>
                    <TabsTrigger value="update">Update Game</TabsTrigger>
                    <TabsTrigger value="search">Search Game</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>
                <TabsContent value="insert">
                    <Card>
                        <CardHeader>
                            <CardTitle>Insert New Game</CardTitle>
                            <CardDescription>Enter details for a new game record</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(newGame).map((key) => (
                                    <div key={key}>
                                        <Label htmlFor={`new-${key}`}>{key.replace('_', ' ')}</Label>
                                        <Input
                                            id={`new-${key}`}
                                            name={key}
                                            value={newGame[key]}
                                            onChange={handleNewGameChange}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button className="mt-4" onClick={insertGame}>Insert Game</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="update">
                    <Card>
                        <CardHeader>
                            <CardTitle>Update Game</CardTitle>
                            <CardDescription>Update an existing game record</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(updateGame).map((key) => (
                                    <div key={key}>
                                        <Label htmlFor={`update-${key}`}>{key.replace('_', ' ')}</Label>
                                        <Input
                                            id={`update-${key}`}
                                            name={key}
                                            value={updateGame[key]}
                                            onChange={handleUpdateGameChange}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button className="mt-4" onClick={updateGameRecord}>Update Game</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="search">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search Game</CardTitle>
                            <CardDescription>Search for a game by ID</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="search-id"
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    placeholder="Enter game ID"
                                />
                                <Button onClick={searchGame}>Search</Button>
                            </div>
                            {searchResult && (
                                <div className="mt-4">
                                    <h3 className="font-semibold">Search Result:</h3>
                                    <pre className="bg-gray-100 p-2 rounded mt-2">
                    {JSON.stringify(searchResult, null, 2)}
                  </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Reports</CardTitle>
                            <CardDescription>View text-based reports</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={generateReports}>Generate Reports</Button>
                            {report1 && (
                                <div className="mt-4">
                                    <h3 className="font-semibold">Report 1: Top 10 Games by Metacritic Score</h3>
                                    <pre className="bg-gray-100 p-2 rounded mt-2">{report1}</pre>
                                </div>
                            )}
                            {report2 && (
                                <div className="mt-4">
                                    <h3 className="font-semibold">Report 2: Average Price by Release Year</h3>
                                    <pre className="bg-gray-100 p-2 rounded mt-2">{report2}</pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}