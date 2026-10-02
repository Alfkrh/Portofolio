/**
 * Penerus handler async.
 *
 * Express 5 sebenarnya sudah meneruskan promise yang ditolak ke error handler,
 * tapi pembungkus ini membuat perilakunya eksplisit dan tetap benar di Express
 * versi lain, sekaligus menghindari `try/catch` berulang di setiap controller.
 */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}
