const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'topics.json');

const app = express();
app.use(cors());
app.use(express.json());

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch (e) {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readTopics() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeTopics(topics) {
  await fs.writeFile(DATA_FILE, JSON.stringify(topics, null, 2), 'utf8');
}

app.get('/api/topics', async (req, res) => {
  try {
    const topics = await readTopics();
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read topics' });
  }
});

app.post('/api/topics', async (req, res) => {
  const { title, description, author } = req.body;
  if (!title || !description || !author) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const topics = await readTopics();
    const topic = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      description,
      author,
      createdAt: Date.now(),
      comments: [],
    };
    topics.push(topic);
    await writeTopics(topics);
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save topic' });
  }
});

app.post('/api/topics/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;
  if (!author || !text) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const topics = await readTopics();
    const topic = topics.find(t => t.id === id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author,
      text,
      createdAt: Date.now(),
    };
    topic.comments.push(comment);
    await writeTopics(topics);
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

const PORT = process.env.PORT || 3000;
ensureDataFile().then(() => {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize data file', err);
  process.exit(1);
});
