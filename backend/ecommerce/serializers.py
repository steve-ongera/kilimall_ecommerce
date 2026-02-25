from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    User, Category, Brand, Product, ProductImage, ProductVariant,
    Review, County, PickupStation, Cart, CartItem, Order, OrderItem,
    MpesaTransaction, Wishlist, Banner
)


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'phone', 'avatar', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'phone', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is deactivated.')
        data['user'] = user
        return data


# ─── Category / Brand ─────────────────────────────────────────────────────────

class CategoryChildSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'icon']


class CategorySerializer(serializers.ModelSerializer):
    children = CategoryChildSerializer(many=True, read_only=True)
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'icon', 'parent', 'children', 'product_count', 'is_active']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo']


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'value', 'price_adjustment', 'stock']


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user', 'user_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['user', 'created_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'category_name', 'brand_name',
            'price', 'original_price', 'discount_percent',
            'stock', 'rating', 'review_count', 'primary_image',
            'is_featured', 'is_flash_deal', 'flash_deal_end', 'created_at'
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    category = CategoryChildSerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'category', 'brand',
            'description', 'short_description',
            'price', 'original_price', 'discount_percent',
            'stock', 'rating', 'review_count',
            'images', 'variants', 'reviews',
            'is_featured', 'is_flash_deal', 'flash_deal_end',
            'views', 'created_at', 'updated_at'
        ]


# ─── Delivery ─────────────────────────────────────────────────────────────────

class PickupStationSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source='county.name', read_only=True)

    class Meta:
        model = PickupStation
        fields = [
            'id', 'name', 'slug', 'county', 'county_name',
            'address', 'delivery_fee', 'latitude', 'longitude',
            'phone', 'working_hours', 'is_active'
        ]


class CountySerializer(serializers.ModelSerializer):
    stations = PickupStationSerializer(many=True, read_only=True)

    class Meta:
        model = County
        fields = ['id', 'name', 'slug', 'code', 'stations']


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    variant_id = serializers.IntegerField(write_only=True, required=False)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'variant', 'variant_id', 'quantity', 'subtotal', 'added_at']
        read_only_fields = ['variant']

    def create(self, validated_data):
        cart = self.context['cart']
        product_id = validated_data.pop('product_id')
        variant_id = validated_data.pop('variant_id', None)
        product = Product.objects.get(id=product_id)
        variant = ProductVariant.objects.get(id=variant_id) if variant_id else None

        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, variant=variant,
            defaults={'quantity': validated_data.get('quantity', 1)}
        )
        if not created:
            item.quantity += validated_data.get('quantity', 1)
            item.save()
        return item


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, source='get_total', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'item_count', 'updated_at']

    def get_item_count(self, obj):
        return sum(i.quantity for i in obj.items.all())


# ─── Orders ───────────────────────────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'variant_name', 'quantity', 'unit_price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    pickup_station = PickupStationSerializer(read_only=True)
    pickup_station_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_status',
            'subtotal', 'delivery_fee', 'total',
            'customer_name', 'customer_phone', 'customer_email', 'notes',
            'pickup_station', 'pickup_station_id',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'status', 'payment_status', 'subtotal', 'delivery_fee', 'total', 'created_at']

    def create(self, validated_data):
        station_id = validated_data.pop('pickup_station_id')
        station = PickupStation.objects.get(id=station_id)
        cart = self.context['cart']

        subtotal = cart.get_total()
        delivery_fee = station.delivery_fee
        total = subtotal + delivery_fee

        order = Order.objects.create(
            pickup_station=station,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total=total,
            user=self.context['request'].user if self.context['request'].user.is_authenticated else None,
            **validated_data
        )

        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product.name,
                product_sku=item.product.sku,
                variant_name=f"{item.variant.name}: {item.variant.value}" if item.variant else '',
                quantity=item.quantity,
                unit_price=item.product.price + (item.variant.price_adjustment if item.variant else 0),
                subtotal=item.subtotal,
            )

        cart.items.all().delete()
        return order


# ─── M-Pesa ───────────────────────────────────────────────────────────────────

# serializers.py

class MpesaSTKPushSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    order_id = serializers.UUIDField()

    def validate_phone_number(self, value):  # ← replace this entire method
        value = value.strip().replace(' ', '').replace('-', '')
        
        if value.startswith('+'):
            value = value[1:]
        elif value.startswith('0'):
            value = '254' + value[1:]
        elif value.startswith('254'):
            pass  # already correct
        elif len(value) == 9:
            value = '254' + value
        
        if not value.startswith('254') or len(value) != 12:
            raise serializers.ValidationError('Enter a valid Kenyan phone number (e.g. 0712345678).')
        
        return value


class MpesaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaTransaction
        fields = ['id', 'checkout_request_id', 'amount', 'phone_number', 'status', 'mpesa_receipt', 'created_at']


# ─── Wishlist / Banner ────────────────────────────────────────────────────────

class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_id', 'added_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ['id', 'title', 'subtitle', 'image', 'link', 'order']