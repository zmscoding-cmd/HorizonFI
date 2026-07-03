const fs = require('fs');
let code = fs.readFileSync('src/components/MultistageModelingConfig.tsx', 'utf8');

const badBlock = `                />
              </div>
            </div>
            
                />
              </div>
            </div>`;

const goodBlock = `                />
              </div>
            </div>`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('src/components/MultistageModelingConfig.tsx', code);
