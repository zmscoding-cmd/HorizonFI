const fs = require('fs');
let code = fs.readFileSync('src/components/MultistageModelingConfig.tsx', 'utf8');

// I need to find where I injected Custom Roth Marginal Tax Brackets.
const startMarker = `            {/* Custom Roth Marginal Tax Brackets */}`;
const endMarker = `                  </div>
                )}
              </div>
            </div>`;

const injectedStartIndex = code.indexOf(startMarker);
const injectedEndIndex = code.indexOf(endMarker) + endMarker.length;

if (injectedStartIndex !== -1) {
  // Extract what we injected
  const injectedBlock = code.substring(injectedStartIndex, injectedEndIndex);
  
  // Remove it from its current bad location, and restore the original `                />\n              </div>`
  code = code.substring(0, injectedStartIndex) + "                />\n              </div>" + code.substring(injectedEndIndex);
  
  // Now place it after the Roth Conversion Start Year block.
  // We look for:
  const rothEndTarget = `className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 min-h-[44px] text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>`;

  const newInsertionPoint = code.indexOf(rothEndTarget) + rothEndTarget.length;
  
  code = code.substring(0, newInsertionPoint) + "\n\n" + injectedBlock + code.substring(newInsertionPoint);
  fs.writeFileSync('src/components/MultistageModelingConfig.tsx', code);
}
