import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; targetId: string }> }
) {
    try {
        const { id, targetId } = await params
        
        const response = await fetch(`${BACKEND_URL}/api/liturgical_times/${id}/merge/${targetId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        })

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        console.error('Error merging liturgical times:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
