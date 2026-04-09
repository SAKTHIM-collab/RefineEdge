# refine-edge/ml_engine/optimizer.py
import numpy as np
from scipy.optimize import linprog

def optimize_production_mix(market_prices, green_mode=False):
    """
    Calculates the optimal crude feed rate and product mix for a CDU.
    Supports a 'Green Mode' that penalizes carbon-intensive products.
    
    Args:
        market_prices (dict): Market prices per barrel (naphtha, diesel, fuel_oil).
        green_mode (bool): If True, applies a carbon tax to the objective function.
    """
    
    # 1. Base Objective Function (Maximizing Profit)
    # Variables order: [Naphtha_Yield, Diesel_Yield, Fuel_Oil_Yield]
    # We negate values because linprog minimizes.
    c = [
        -market_prices.get('naphtha', 85), 
        -market_prices.get('diesel', 110), 
        -market_prices.get('fuel_oil', 65)
    ]

    # 2. Sustainability Penalty (The "Green Tax")
    # If Green Mode is enabled, we add a cost (penalty) to the products.
    # Fuel Oil (Heaviest/Dirtiest) gets the highest penalty.
    carbon_tax = [5.0, 10.0, 25.0] # USD penalty per barrel
    
    if green_mode:
        # We add the tax to the negated revenue. 
        # (e.g., -110 profit + 10 tax = -100 effective profit)
        c = [val + tax for val, tax in zip(c, carbon_tax)]

    # 3. Equality Constraints (A_eq * x = b_eq)
    # Mass Balance: The outputs must equal a specific fraction of total feed.
    # Yields: 20% Naphtha, 45% Diesel, 35% Fuel Oil
    # This ensures the model follows the chemical physics of the unit.
    # Since sum(yields) = 1.0, we can define constraints based on total feed.
    
    # 4. Inequality Constraints (A_ub * x <= b_ub)
    # Facility limits. Max total throughput = 100,000 bpd
    A_ub = [[1.0, 1.0, 1.0]]
    b_ub = [100000]

    # 5. Bounds (Individual Unit Bottlenecks)
    # Naphtha: min 5k, max 40k | Diesel: min 10k, max 50k | Fuel Oil: min 2k, max 20k
    bounds = [
        (5000, 40000), 
        (10000, 50000), 
        (2000, 20000)
    ]

    # 6. Run the Optimizer
    res = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')

    if res.success:
        # Calculate true profit by stripping out the virtual carbon tax if it was applied
        raw_profit = -res.fun
        if green_mode:
            # Add back the penalties to show real financial profit vs optimized ESG profit
            total_penalty = sum(res.x * carbon_tax)
            actual_financial_profit = raw_profit + total_penalty
        else:
            actual_financial_profit = raw_profit

        return {
            "status": "Optimal Solution Found",
            "strategy": "Sustainability Optimized" if green_mode else "Profit Maximized",
            "optimal_crude_feed_bpd": round(sum(res.x), 2),
            "projected_daily_profit_usd": round(actual_financial_profit, 2),
            "product_mix_bpd": {
                "naphtha": round(res.x[0], 2),
                "diesel": round(res.x[1], 2),
                "fuel_oil": round(res.x[2], 2)
            },
            "carbon_penalty_applied": round(sum(res.x * carbon_tax), 2) if green_mode else 0
        }
    else:
        return {"status": "Optimization Failed", "error": res.message}

# Quick test execution
if __name__ == "__main__":
    market = {'naphtha': 90, 'diesel': 110, 'fuel_oil': 70}
    print("--- PROFIT MODE ---")
    print(optimize_production_mix(market, green_mode=False))
    print("\n--- SUSTAINABILITY MODE ---")
    print(optimize_production_mix(market, green_mode=True))