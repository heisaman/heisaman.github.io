---
layout: post
title: Django项目下使用CKEditor编辑器指南
---


[CKEditor](ckeditor.com/) is a customizable, open source **WYSIWYG** text editor, which is used in our project.

Django CKEditor
===============
For easy integration with our Django project, we use a third-party app [django-ckeditor](https://github.com/django-ckeditor/django-ckeditor). Pls follow the app's README instructions to know how to use it.

**_A few tips to notice:_**


> Add CKEditor URL include to your project's urls.py file:

>       (r'^ckeditor/', include('ckeditor_uploader.urls')),

Use: `url(r'^ckeditor/', include('ckeditor_uploader.urls')),` , and it must be at the root of your urlpatterns.


> Note that by adding those URLs you add views that can upload and browse through uploaded images. Since django-ckeditor 4.4.6 those views are **staff_member_required**. If you want different permission decorator (login_required, user_passes_test etc.) then add views defined in **ckeditor.urls** manualy to you urls.py.

Better use **login_required** decorator, and you can add views defined in **ckeditor_uploader/urls.py** manually to your own urls.py to re-write it. Or, just change ckeditor_uploader source code in ckeditor_uploader/urls.py like below:

      ...
      from django.contrib.admin.views.decorators import staff_member_required
      from django.contrib.auth.decorators import login_required
      ...
      
      if django.VERSION >= (1, 8):
          urlpatterns = [
              url(r'^upload/', login_required(views.upload), name='ckeditor_upload'),    # login_required replaced staff_member_required
              url(r'^browse/', never_cache(login_required(views.browse)), name='ckeditor_browse'),   # login_required replaced staff_member_required
          ]
      else:
          ...



Configure the default toolbar as below(add or remove items as you wish), and remember to include `'language': 'zh-cn'` to show simplified Chinese :


      CKEDITOR_CONFIGS = {
          'default': {
              'toolbar': (
                  ['Preview','-','Templates'],
                  ['Bold','Italic','Underline'],
                  ['Styles','Format','Font','FontSize'],
                  ['TextColor','BGColor'],
                  ['NumberedList','BulletedList','-','Outdent','Indent','Blockquote'],
                  ['JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock'],
                  ['Link','Unlink','Anchor'],
                  ['Image','Flash','Table','HorizontalRule','Smiley','SpecialChar','PageBreak'],
              ),
              'language': 'zh-cn',
              'width': 585,
          },
      }


Management Commands

Included is a management command to create thumbnails for images already contained in ``CKEDITOR_UPLOAD_PATH``. This is useful to create thumbnails when starting to use django-ckeditor with existing images. Issue the command as follows::

    $ ./manage.py generateckeditorthumbnails

**NOTE**: If you're using custom views remember to include ckeditor.js in your form's media either through ``{{ form.media }}`` or through a ``<script>`` tag. Admin will do this for you automatically. See `Django's Form Media docs <http://docs.djangoproject.com/en/dev/topics/forms/media/>`_ for more info.