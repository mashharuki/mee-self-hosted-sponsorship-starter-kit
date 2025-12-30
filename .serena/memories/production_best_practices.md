# Production Best Practices

## Security
1. **Private Keys**: Use encrypted ENV variables or secure key management
   - Never commit private keys to version control
   - Consider using environment-specific configuration
   
2. **API Protection**: Implement authentication/authorization
   - SDK supports custom headers for API key passing
   - Add middleware for request validation

## Gas Tank Configuration
1. **Token Selection**: Use USDC or other stable coins
   - ⚠️ Gas tanks do NOT support native tokens for sponsorship
   
2. **Network Selection**: Deploy on cheap L2 networks
   - Minimizes gas costs for sponsorship
   - Better user experience with lower fees

3. **Auto-deployment**: Gas tanks are deployed automatically
   - Ensure sufficient funds for initial deployment
   - Monitor deployment status

## Monitoring & Maintenance
1. Fund gas tanks adequately before going live
2. Monitor gas tank balances regularly
3. Set up alerts for low balances
4. Track sponsorship usage and costs

## API Standards
1. Endpoint URLs must match MEE stack exactly
2. Maintain consistent request/response structures
3. Error handling must follow MEE stack patterns
4. Ensure backward compatibility with MEE stack
