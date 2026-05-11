module.exports = function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  // PostgreSQL foreign key violation
  if (err && err.code === '23503') {
    if (req.flash) req.flash('error', 'Cannot delete: record is referenced by other data.');
    return res.redirect('back');
  }

  res.status(500);

  // If logged in, show inside admin UI
  if (req.session?.user) {
    return res.render('resource/details', {
      title: 'Server Error',
      meta: { table: 'error', schema: 'public', columns: [{ column_name: 'message' }], pk: ['message'] },
      row: { message: err.message || 'Unknown error', __pk: '' },
      related: []
    });
  }

  res.send('500 Server Error');
};
