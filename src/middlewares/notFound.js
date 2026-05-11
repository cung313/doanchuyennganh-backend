module.exports = function notFound(req, res) {
  res.status(404);
  if (req.session?.user) {
    return res.render('resource/details', {
      title: 'Not Found',
      meta: { table: 'not_found', schema: 'public', columns: [{ column_name: 'message' }], pk: ['message'] },
      row: { message: `No route for ${req.method} ${req.originalUrl}`, __pk: '' },
      related: []
    });
  }
  return res.send('404 Not Found');
};
