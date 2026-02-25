from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet, basename='category')
router.register('brands', views.BrandViewSet, basename='brand')
router.register('products', views.ProductViewSet, basename='product')
router.register('counties', views.CountyViewSet, basename='county')
router.register('pickup-stations', views.PickupStationViewSet, basename='pickup-station')
router.register('orders', views.OrderViewSet, basename='order')
router.register('wishlist', views.WishlistViewSet, basename='wishlist')
router.register('banners', views.BannerViewSet, basename='banner')

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),

    # Cart
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/items/<int:item_id>/', views.CartItemView.as_view(), name='cart-item'),

    # M-Pesa
    path('mpesa/stk-push/', views.MpesaSTKPushView.as_view(), name='mpesa-stk-push'),
    path('mpesa/callback/', views.MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('mpesa/status/<str:checkout_request_id>/', views.MpesaStatusView.as_view(), name='mpesa-status'),
    path('mpesa/query/<str:checkout_request_id>/', views.MpesaSTKQueryView.as_view(), name='mpesa-query'),

    path('', include(router.urls)),
]