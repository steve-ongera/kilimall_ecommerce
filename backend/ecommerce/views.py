import base64
import hashlib
import hmac
import json
import requests
from datetime import datetime
from django_filters import rest_framework as df_filters
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    User, Category, Brand, Product, Review,
    County, PickupStation, Cart, CartItem,
    Order, MpesaTransaction, Wishlist, Banner
)
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    CategorySerializer, BrandSerializer,
    ProductListSerializer, ProductDetailSerializer, ReviewSerializer,
    CountySerializer, PickupStationSerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer, MpesaSTKPushSerializer, MpesaTransactionSerializer,
    WishlistSerializer, BannerSerializer
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_or_create_cart(request):
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
    else:
        if not request.session.session_key:
            request.session.create()
        cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
    return cart


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Category ─────────────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True, parent=None).prefetch_related('children')
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    permission_classes = [AllowAny]


# ─── Brand ────────────────────────────────────────────────────────────────────

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    lookup_field = 'slug'
    permission_classes = [AllowAny]


# ─── Product ──────────────────────────────────────────────────────────────────
class ProductFilter(df_filters.FilterSet):
    min_price = df_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = df_filters.NumberFilter(field_name='price', lookup_expr='lte')
    category  = df_filters.CharFilter(field_name='category__slug')
    brand     = df_filters.CharFilter(field_name='brand__slug')

    class Meta:
        model = Product
        fields = ['category', 'brand', 'is_featured', 'is_flash_deal', 'min_price', 'max_price']

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related('category', 'brand').prefetch_related('images')
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter                    # ← swap this in (replaces filterset_fields)
    search_fields = ['name', 'description', 'sku', 'brand__name', 'category__name']
    ordering_fields = ['price', 'rating', 'created_at', 'views']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        return super().retrieve(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        qs = self.get_queryset().filter(is_featured=True)[:12]
        return Response(ProductListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def flash_deals(self, request):
        qs = self.get_queryset().filter(is_flash_deal=True, flash_deal_end__gt=timezone.now())[:12]
        return Response(ProductListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def new_arrivals(self, request):
        qs = self.get_queryset().order_by('-created_at')[:12]
        return Response(ProductListSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticatedOrReadOnly])
    def reviews(self, request, slug=None):
        product = self.get_object()
        if request.method == 'GET':
            reviews = product.reviews.all()
            return Response(ReviewSerializer(reviews, many=True).data)
        serializer = ReviewSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product)
        # Update rating
        reviews = product.reviews.all()
        product.rating = sum(r.rating for r in reviews) / reviews.count()
        product.review_count = reviews.count()
        product.save(update_fields=['rating', 'review_count'])
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ─── Delivery ─────────────────────────────────────────────────────────────────

class CountyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = County.objects.prefetch_related('stations')
    serializer_class = CountySerializer
    lookup_field = 'slug'
    permission_classes = [AllowAny]


class PickupStationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PickupStation.objects.filter(is_active=True).select_related('county')
    serializer_class = PickupStationSerializer
    lookup_field = 'slug'
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['county__slug']


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cart = get_or_create_cart(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    def post(self, request):
        cart = get_or_create_cart(request)
        serializer = CartItemSerializer(data=request.data, context={'cart': cart, 'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cart.refresh_from_db()
        return Response(CartSerializer(cart, context={'request': request}).data, status=status.HTTP_201_CREATED)


class CartItemView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, item_id):
        cart = get_or_create_cart(request)
        try:
            item = cart.items.get(id=item_id)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found.'}, status=404)
        qty = request.data.get('quantity', item.quantity)
        if int(qty) <= 0:
            item.delete()
        else:
            item.quantity = qty
            item.save()
        return Response(CartSerializer(cart, context={'request': request}).data)

    def delete(self, request, item_id):
        cart = get_or_create_cart(request)
        cart.items.filter(id=item_id).delete()
        return Response(CartSerializer(cart, context={'request': request}).data)


# ─── Orders ───────────────────────────────────────────────────────────────────


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post']

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items').select_related('pickup_station')

    @action(detail=False, methods=['get'])
    def by_number(self, request):
        number = request.query_params.get('order_number')
        try:
            order = Order.objects.get(order_number=number)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)
        return Response(OrderSerializer(order).data)

    def create(self, request):
        print("\n" + "="*60)
        print("📦 ORDER CREATE - DEBUG")
        print("="*60)

        print(f"👤 User         : {request.user} | authenticated: {request.user.is_authenticated}")
        print(f"📨 Request data : {dict(request.data)}")

        cart = get_or_create_cart(request)
        print(f"🛒 Cart id      : {cart.id}")
        print(f"🛒 Cart items   : {cart.items.count()}")
        for item in cart.items.all():
            print(f"   - {item.product.name} x{item.quantity} @ KES {item.product.price} = KES {item.subtotal}")
        print(f"🛒 Cart total   : KES {cart.get_total()}")

        if not cart.items.exists():
            print("❌ FAIL: Cart is empty")
            return Response({'error': 'Cart is empty.'}, status=400)

        station_id = request.data.get('pickup_station_id')
        print(f"🏪 pickup_station_id received: {station_id!r}")
        if station_id:
            try:
                station = PickupStation.objects.get(id=station_id)
                print(f"🏪 Station found: {station.name} | fee: KES {station.delivery_fee}")
            except PickupStation.DoesNotExist:
                print(f"❌ FAIL: PickupStation id={station_id} does NOT exist in DB")
        else:
            print("❌ FAIL: pickup_station_id is missing from request data")

        print("\n--- Serializer validation ---")
        serializer = OrderSerializer(
            data=request.data,
            context={'request': request, 'cart': cart}
        )
        is_valid = serializer.is_valid()
        print(f"✅ is_valid      : {is_valid}")
        if not is_valid:
            print(f"❌ Errors        : {serializer.errors}")
            print("="*60 + "\n")
            return Response(serializer.errors, status=400)

        try:
            order = serializer.save()
            print(f"🎉 Order created : #{order.order_number} | total: KES {order.total}")
            print("="*60 + "\n")
            return Response(OrderSerializer(order).data, status=201)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print("="*60 + "\n")
            return Response({'error': str(e)}, status=400)
        
def get_mpesa_access_token():
    url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    if not settings.MPESA_ENVIRONMENT == 'sandbox':
        url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    
    response = requests.get(url, auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET))
    result = response.json()
    
    print(f"🔑 Token response status : {response.status_code}")
    print(f"🔑 Token response body   : {result}")
    
    token = result.get('access_token')
    if not token:
        raise ValueError(f"Failed to get access token: {result}")
    return token


class MpesaSTKPushView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        print("\n" + "="*60)
        print("💳 MPESA STK PUSH - DEBUG")
        print("="*60)
        print(f"📨 Request data: {dict(request.data)}")

        serializer = MpesaSTKPushSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"❌ Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=400)

        phone = serializer.validated_data['phone_number']
        order_id = serializer.validated_data['order_id']
        print(f"📱 Phone (normalized): {phone}")
        print(f"🧾 Order ID          : {order_id}")

        try:
            order = Order.objects.get(id=order_id)
            print(f"✅ Order found: #{order.order_number} | total: KES {order.total} | payment_status: {order.payment_status}")
        except Order.DoesNotExist:
            print(f"❌ Order {order_id} not found")
            return Response({'error': 'Order not found.'}, status=404)

        amount = int(order.total)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        shortcode = settings.MPESA_SHORTCODE
        passkey = settings.MPESA_PASSKEY
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

        print(f"\n--- M-Pesa Config ---")
        print(f"🏦 Shortcode     : {shortcode}")
        print(f"🌍 Environment   : {settings.MPESA_ENVIRONMENT}")
        print(f"🔗 Callback URL  : {settings.MPESA_CALLBACK_URL}")
        print(f"💰 Amount        : {amount}")
        print(f"🕐 Timestamp     : {timestamp}")
        # Mask passkey but confirm it's set
        print(f"🔐 Passkey set   : {'Yes' if passkey else 'NO - THIS IS THE PROBLEM'}")
        print(f"🔐 Consumer key  : {'Yes' if settings.MPESA_CONSUMER_KEY else 'NO - THIS IS THE PROBLEM'}")

        try:
            token = get_mpesa_access_token()
            print(f"🔑 Access token  : {token[:20]}..." if token else "❌ No token!")
        except Exception as e:
            print(f"❌ Token fetch failed: {e}")
            return Response({'error': f'Could not get M-Pesa token: {str(e)}'}, status=500)

        base_url = 'https://sandbox.safaricom.co.ke' if settings.MPESA_ENVIRONMENT == 'sandbox' else 'https://api.safaricom.co.ke'

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": order.order_number,
            "TransactionDesc": f"Payment for order {order.order_number}",
        }

        print(f"\n--- STK Push Payload ---")
        print(f"📤 Payload (sans password): { {k: v for k, v in payload.items() if k != 'Password'} }")

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        stk_url = f"{base_url}/mpesa/stkpush/v1/processrequest"
        print(f"🌐 Posting to: {stk_url}")

        response = requests.post(stk_url, json=payload, headers=headers)
        data = response.json()

        print(f"\n--- Safaricom Response ---")
        print(f"📥 Status code : {response.status_code}")
        print(f"📥 Response    : {data}")
        print("="*60 + "\n")

        if data.get('ResponseCode') == '0':
            txn = MpesaTransaction.objects.create(
                order=order,
                checkout_request_id=data['CheckoutRequestID'],
                merchant_request_id=data.get('MerchantRequestID', ''),
                amount=amount,
                phone_number=phone,
            )
            return Response({
                'message': 'STK push sent. Check your phone.',
                'checkout_request_id': txn.checkout_request_id,
            })

        return Response({'error': data.get('errorMessage', 'STK push failed.')}, status=400)
    
    
class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        try:
            stk = data['Body']['stkCallback']
            checkout_id = stk['CheckoutRequestID']
            result_code = stk['ResultCode']
            result_desc = stk['ResultDesc']

            txn = MpesaTransaction.objects.get(checkout_request_id=checkout_id)
            txn.result_code = result_code
            txn.result_desc = result_desc

            if result_code == 0:
                items = {i['Name']: i['Value'] for i in stk['CallbackMetadata']['Item']}
                txn.mpesa_receipt = items.get('MpesaReceiptNumber', '')
                txn.transaction_date = str(items.get('TransactionDate', ''))
                txn.status = 'success'
                if txn.order:
                    txn.order.payment_status = 'paid'
                    txn.order.status = 'confirmed'
                    txn.order.save(update_fields=['payment_status', 'status'])
            else:
                txn.status = 'failed'

            txn.save()
        except Exception as e:
            return Response({'error': str(e)}, status=400)
        return Response({'ResultCode': 0, 'ResultDesc': 'Success'})


class MpesaStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, checkout_request_id):
        try:
            txn = MpesaTransaction.objects.get(checkout_request_id=checkout_request_id)
            return Response(MpesaTransactionSerializer(txn).data)
        except MpesaTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found.'}, status=404)


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')

    def create(self, request):
        serializer = WishlistSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        obj, created = Wishlist.objects.get_or_create(
            user=request.user,
            product_id=serializer.validated_data['product_id']
        )
        return Response(WishlistSerializer(obj).data, status=201 if created else 200)


# ─── Banner ───────────────────────────────────────────────────────────────────

class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer
    permission_classes = [AllowAny]
    
    
    
class MpesaSTKQueryView(APIView):
    """Actively query Safaricom for STK push status - fallback if callback is slow."""
    permission_classes = [AllowAny]

    def get(self, request, checkout_request_id):
        try:
            txn = MpesaTransaction.objects.get(checkout_request_id=checkout_request_id)
        except MpesaTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found.'}, status=404)

        # If already resolved, return immediately
        if txn.status in ('success', 'failed', 'cancelled'):
            return Response(MpesaTransactionSerializer(txn).data)

        # Query Safaricom directly
        try:
            token = get_mpesa_access_token()
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            shortcode = settings.MPESA_SHORTCODE
            password = base64.b64encode(
                f"{shortcode}{settings.MPESA_PASSKEY}{timestamp}".encode()
            ).decode()

            base_url = (
                'https://sandbox.safaricom.co.ke'
                if settings.MPESA_ENVIRONMENT == 'sandbox'
                else 'https://api.safaricom.co.ke'
            )

            payload = {
                "BusinessShortCode": shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id,
            }
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                f"{base_url}/mpesa/stkpushquery/v1/query",
                json=payload,
                headers=headers,
            )
            data = response.json()
            print(f"🔍 STK Query response: {data}")

            result_code = data.get('ResultCode')

            if result_code is not None:
                result_code = int(result_code)
                txn.result_code = result_code
                txn.result_desc = data.get('ResultDesc', '')

                if result_code == 0:
                    txn.status = 'success'
                    if txn.order:
                        txn.order.payment_status = 'paid'
                        txn.order.status = 'confirmed'
                        txn.order.save(update_fields=['payment_status', 'status'])
                elif result_code in (1032, 1037):
                    # 1032 = cancelled by user, 1037 = timeout
                    txn.status = 'cancelled'
                else:
                    txn.status = 'failed'

                txn.save()

        except Exception as e:
            print(f"❌ STK Query failed: {e}")
            # Don't fail — just return current DB status

        return Response(MpesaTransactionSerializer(txn).data)