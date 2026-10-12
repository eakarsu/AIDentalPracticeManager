function throwIfCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('AI request cancelled');
    error.name = 'AbortError';
    throw error;
  }
}

function readNativeReviewFocus(body) {
  if (body.review_focus === undefined || body.review_focus === null) return '';
  if (typeof body.review_focus !== 'string' || body.review_focus.length > 1200) {
    const error = new Error('Review focus must be text of at most 1200 characters.');
    error.statusCode = 400;
    throw error;
  }
  return body.review_focus.trim();
}

function nativeAIRequestLifecycle(req, res, next) {
  const controller = new AbortController();
  req.aiSignal = controller.signal;
  const abort = () => controller.abort();
  const close = () => { if (!res.writableEnded) abort(); };
  const cleanup = () => { req.off('aborted', abort); res.off('close', close); res.off('finish', cleanup); };
  req.once('aborted', abort);
  res.once('close', close);
  res.once('finish', cleanup);
  next();
}

async function requireCurrentAIActor(database, actorId, signal, lock = false) {
  throwIfCancelled(signal);
  if (!Number.isSafeInteger(Number(actorId)) || Number(actorId) < 1) {
    const error = new Error('Sign in again before generating an AI report');
    error.statusCode = 401;
    throw error;
  }
  const result = await database.query('SELECT id FROM users WHERE id = $1' + (lock ? ' FOR KEY SHARE' : ''), [actorId]);
  throwIfCancelled(signal);
  if (!result.rows.length) {
    const error = new Error('The authenticated account is no longer available. Sign in again.');
    error.statusCode = 401;
    throw error;
  }
}

async function persistNativeAIResult(database, parameters, actorId, signal) {
  throwIfCancelled(signal);
  const client = await database.pool.connect();
  try {
    throwIfCancelled(signal);
    await client.query('BEGIN');
    await requireCurrentAIActor(client, actorId, signal, true);
    await client.query(
      'INSERT INTO ai_results (endpoint, resource_type, resource_id, input_summary, result, model, tokens_used, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      parameters
    );
    throwIfCancelled(signal);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { nativeAIRequestLifecycle, requireCurrentAIActor, persistNativeAIResult, throwIfCancelled, readNativeReviewFocus };
