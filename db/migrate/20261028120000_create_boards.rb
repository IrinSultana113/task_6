class CreateBoards < ActiveRecord::Migration[8.1]
  def change
    create_table :boards do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :creator_nickname, null: false
      t.datetime :last_activity_at
      t.integer :strokes_count, null: false, default: 0

      t.timestamps
    end

    add_index :boards, :slug, unique: true
    add_index :boards, :last_activity_at
  end
end
