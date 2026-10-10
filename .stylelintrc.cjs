/** Paper type scale: no raw px font sizes in paper/ or ui/. Tasks screens are out of scope (MDF-49). */
module.exports = {
  ignoreFiles: ['**/screens/tasks/**', '**/screens/automations/**', '**/screens/memory/**'],
  rules: {
    'declaration-property-value-disallowed-list': {
      'font-size': ['/\\d+px/']
    }
  }
};
