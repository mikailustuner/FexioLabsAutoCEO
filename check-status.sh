#!/bin/bash

# FLAO Docker Container Status Check Script
# Usage: ./check-status.sh

echo "=========================================="
echo "FLAO Docker Container Status"
echo "=========================================="
echo ""

# Check if containers are running
echo "📦 Container Status:"
docker-compose ps
echo ""

# Check container health
echo "🏥 Container Health:"
docker ps --filter "name=flao" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check API Gateway health endpoint
echo "🔍 API Gateway Health Check:"
API_PORT=${PORT:-3001}
if curl -s -f "http://localhost:${API_PORT}/health" > /dev/null; then
    echo "✅ API Gateway is healthy"
    curl -s "http://localhost:${API_PORT}/health" | jq '.' 2>/dev/null || curl -s "http://localhost:${API_PORT}/health"
else
    echo "❌ API Gateway is not responding"
fi
echo ""

# Check WhatsApp status
echo "📱 WhatsApp Status:"
if curl -s -f "http://localhost:${API_PORT}/whatsapp/status" > /dev/null; then
    curl -s "http://localhost:${API_PORT}/whatsapp/status" | jq '.' 2>/dev/null || curl -s "http://localhost:${API_PORT}/whatsapp/status"
else
    echo "❌ WhatsApp status endpoint not available"
fi
echo ""

# Check logs (last 10 lines)
echo "📋 Recent Logs (last 10 lines):"
docker-compose logs --tail=10 api-gateway
echo ""

# Check port usage
echo "🔌 Port Usage:"
echo "API Gateway: http://localhost:${API_PORT}"
echo "PostgreSQL: localhost:${POSTGRES_PORT:-5433}"
echo ""

echo "=========================================="
echo "Useful Commands:"
echo "  View logs:        docker-compose logs -f api-gateway"
echo "  View all logs:    docker-compose logs -f"
echo "  Restart:          docker-compose restart"
echo "  Stop:             docker-compose down"
echo "  Start:            docker-compose up -d"
echo "=========================================="

