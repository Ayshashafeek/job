const express = require('express');
const { Inngest } = require('inngest');
const { serve } = require('inngest/express');

const app = express();
const PORT = 3000;

const inngest = new Inngest({
  id: 'report-api',
});

const sayHello = inngest.createFunction(
  {
    id: 'say-hello',
    triggers: [{ event: 'test/hello' }],
  },
  async ({ step }) => {
    await step.sleep('wait-5-seconds', '5s');

    return 'Hello from the background!';
  }
);

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions: [sayHello],
  })
);

console.log('Inngest route registered');

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});