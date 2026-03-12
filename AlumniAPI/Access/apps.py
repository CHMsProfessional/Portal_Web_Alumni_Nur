from django.apps import AppConfig


class AccessConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'Access'

    def ready(self):
        if self.name != "Access":
            return
            
        import Access.signals
