const crypto = require('crypto');
const express = require('express');
const { Inngest, cron } = require('inngest');
const { serve } = require('inngest/express');

const app = express();
const PORT = 3000;

const inngest = new Inngest({
  id: 'report-api',
});

const reports = new Map();

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

const makeReport = inngest.createFunction(
  {
    id: 'make-report',
    retries: 2,
    triggers: [{ event: 'report/requested' }],
    onFailure: async ({ event }) => {
      const reportId = event.data?.event?.data?.id;
      const report = reports.get(reportId);

      if (report) {
        reports.set(reportId, {
          ...report,
          status: 'failed',
        });
      }
    },
  },
  async ({ event, step }) => {
    await step.sleep('do-the-slow-work', '8s');

    return step.run('build-report', async () => {
      const { id, topic } = event.data;

      if (topic === 'fail') {
        throw new Error('The report oven is broken!');
      }

      const report = {
        id,
        topic,
        status: 'done',
        result: `This is a report about ${topic}.`,
      };

      reports.set(id, report);
      return report;
    });
  }
);

const heartbeat = inngest.createFunction(
  {
    id: 'heartbeat',
    triggers: [cron('* * * * *')],
  },
  async () => {
    const counts = {
      pending: 0,
      done: 0,
      failed: 0,
    };

    for (const report of reports.values()) {
      counts[report.status] += 1;
    }

    console.log(
      `[heartbeat] pending=${counts.pending} done=${counts.done} failed=${counts.failed}`
    );

    return counts;
  }
);

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

app.post('/reports', async (req, res) => {
  const topic =
    typeof req.body?.topic === 'string'
      ? req.body.topic.trim()
      : '';

  if (!topic) {
    return res.status(400).json({
      error: 'topic is required',
    });
  }

  const id = crypto.randomUUID();

  reports.set(id, {
    id,
    topic,
    status: 'pending',
  });

  await inngest.send({
    name: 'report/requested',
    data: {
      id,
      topic,
    },
  });

  return res.status(202).json({
    id,
    status: 'pending',
  });
});

app.get('/reports/:id', (req, res) => {
  const report = reports.get(req.params.id);

  if (!report) {
    return res.status(404).json({
      error: 'report not found',
    });
  }

  return res.status(200).json(report);
});

app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions: [sayHello, makeReport, heartbeat],
  })
);

console.log('Inngest route registered');

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
});

server.on('close', () => {
  console.log('SERVER CLOSED');
});