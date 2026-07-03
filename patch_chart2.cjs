const fs = require('fs');
let code = fs.readFileSync('src/components/LongTermPortfolioChart.tsx', 'utf8');

// Replace Tooltip Variables
code = code.replace(
`    const otherVal = dataObj.OTHER_ASSETS;`,
`    const preTaxVal = dataObj.PRE_TAX;
    const rothVal = dataObj.ROTH;
    const cashVal = dataObj.CASH;
    const taxableOtherVal = dataObj.TAXABLE_OTHER;`
);

// Replace Tooltip rendering
code = code.replace(
`          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Other Assets
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(otherVal)}</span>
          </div>`,
`          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Taxable (Other)
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(taxableOtherVal)}</span>
          </div>

          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
              Cash
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(cashVal)}</span>
          </div>

          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Pre-Tax
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(preTaxVal)}</span>
          </div>

          <div className="flex justify-between gap-8 items-center">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Roth
            </span>
            <span className="font-mono font-semibold text-zinc-850 dark:text-zinc-100">{formatCurrency(rothVal)}</span>
          </div>`
);


// Replace Gradients
code = code.replace(
`          <defs>
            <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>`,
`          <defs>
            <linearGradient id="colorPreTax" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorRoth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#047857" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#047857" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorOtherTaxable" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>`
);

// Replace Areas
code = code.replace(
`          {/* 1. Stacked Areas representing Net Worth breakdown */}
          <Area
            type="monotone"
            dataKey="OTHER_ASSETS"
            name="Other Assets"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorOther)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />`,
`          {/* 1. Stacked Areas representing Net Worth breakdown */}
          <Area
            type="monotone"
            dataKey="PRE_TAX"
            name="Pre-Tax"
            stackId="1"
            stroke="#6366f1"
            fill="url(#colorPreTax)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="ROTH"
            name="Roth"
            stackId="1"
            stroke="#a855f7"
            fill="url(#colorRoth)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="CASH"
            name="Cash"
            stackId="1"
            stroke="#047857"
            fill="url(#colorCash)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="TAXABLE_OTHER"
            name="Taxable (Other)"
            stackId="1"
            stroke="#3b82f6"
            fill="url(#colorOtherTaxable)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />`
);

fs.writeFileSync('src/components/LongTermPortfolioChart.tsx', code);
