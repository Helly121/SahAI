// Forward to root config-overrides so react-app-rewired in this subfolder
// can load the shared configuration during CI/deploy builds.
module.exports = require('../../config-overrides');
